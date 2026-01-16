import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "./user.entity";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import * as bcrypt from "bcrypt";
import { Student } from "../students/student.entity";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { TeacherAssignment } from "../teacher-assignments/teacher-assignment.entity";
import { QuestionBank } from "../question-bank/question-bank.entity";
import { Submission } from "../submissions/submission.entity";
import { Repository as TypeOrmRepository, QueryFailedError } from "typeorm";

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>,
		@InjectRepository(Class)
		private classesRepository: Repository<Class>,
		@InjectRepository(TeacherAssignment)
		private teacherAssignmentsRepository: TypeOrmRepository<TeacherAssignment>,
		@InjectRepository(QuestionBank)
		private questionBankRepository: TypeOrmRepository<QuestionBank>,
		@InjectRepository(Submission)
		private submissionsRepository: TypeOrmRepository<Submission>
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		// Check for unique email (if provided)
		if (createUserDto.email) {
			const existingByEmail = await this.usersRepository.findOne({
				where: { email: createUserDto.email },
			});

			if (existingByEmail) {
				throw new ConflictException("Email already exists");
			}
		}

		// Check NIS duplicate for students
		if (createUserDto.role === "student" && createUserDto.nis) {
			const existingByNis = await this.usersRepository.findOne({
				where: { nis: createUserDto.nis },
			});

			if (existingByNis) {
				throw new ConflictException("NIS already exists");
			}
		}

		// Check NIP duplicate for teachers
		if (createUserDto.role === "teacher" && createUserDto.nip) {
			const existingByNip = await this.usersRepository.findOne({
				where: { nip: createUserDto.nip },
			});

			if (existingByNip) {
				throw new ConflictException("NIP already exists");
			}
		}

		const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

		const user = this.usersRepository.create({
			...createUserDto,
			password: hashedPassword,
			isActive: true,
		});

		const savedUser = await this.usersRepository.save(user);

		// Auto-create Student record for student role in active semester
		if (savedUser.role === UserRole.STUDENT) {
			await this.createStudentRecordForActiveSemester(
				savedUser.id,
				createUserDto.studentName
			);
		}

		return savedUser;
	}

	/**
	 * Fallback: synchronize teacher-class many-to-many join table (class_teachers)
	 * to match requested class ids for a semester when `teacher_assignments` table
	 * is not available (e.g., migrations not applied yet).
	 */
	private async fallbackSyncTeacherClassesUsingJoinTable(
		teacherId: number,
		wantedClassIds: Set<number>,
		semesterId?: number
	) {
		const teacher = await this.usersRepository.findOne({
			where: { id: teacherId },
		});
		if (!teacher) throw new NotFoundException("Teacher not found (fallback)");

		const allClasses = await this.classesRepository.find({
			relations: ["teachers"],
		});

		for (const cls of allClasses) {
			if (semesterId && cls.semesterId !== semesterId) continue;

			const hasTeacher = (cls.teachers || []).some((t) => t.id === teacherId);
			const shouldHave = wantedClassIds.has(cls.id);

			if (shouldHave && !hasTeacher) {
				cls.teachers = [...(cls.teachers || []), teacher as any];
				await this.classesRepository.save(cls);
			} else if (!shouldHave && hasTeacher) {
				cls.teachers = (cls.teachers || []).filter((t) => t.id !== teacherId);
				await this.classesRepository.save(cls);
			}
		}
	}

	private async fallbackClearTeacherClassesForSemester(
		teacherId: number,
		semesterId?: number
	) {
		await this.fallbackSyncTeacherClassesUsingJoinTable(
			teacherId,
			new Set<number>(),
			semesterId
		);
	}

	private async createStudentRecordForActiveSemester(
		userId: number,
		studentName?: string
	): Promise<void> {
		const activeSemester = await this.semestersRepository.findOne({
			where: { isActive: true },
		});

		if (!activeSemester) {
			// No active semester, skip creating student record
			return;
		}

		// Check if student record already exists
		const existingStudent = await this.studentsRepository.findOne({
			where: {
				userId,
				semesterId: activeSemester.id,
			},
		});

		if (existingStudent) {
			// Already exists, skip
			return;
		}

		// Get user data for student name
		const user = await this.usersRepository.findOne({
			where: { id: userId },
		});

		if (!user) {
			return;
		}

		// Create student record without class assignment (admin will assign later)
		const student = this.studentsRepository.create({
			userId,
			semesterId: activeSemester.id,
			name: studentName || user.name, // Use provided studentName, fallback to user.name
			isActive: true,
		});

		await this.studentsRepository.save(student);
	}

	async findAll(role?: UserRole): Promise<User[]> {
		const where: any = {};
		if (role) where.role = role;

		const relations = [
			"students",
			"students.class",
			"students.semester",
		] as const;
		// Include teachingClasses when fetching teachers so UI can prefill wali
		if (!role || role === UserRole.TEACHER) {
			(relations as any).push("teachingClasses");
			(relations as any).push("teacherAssignments");
			(relations as any).push("teacherAssignments.semester");
			(relations as any).push("teacherAssignments.cls");
		}

		const users = await this.usersRepository.find({
			where,
			relations: relations as any,
			order: { name: "ASC" },
		});

		// For teachers, enrich teachingClasses with semesterId from teacherAssignments
		if (!role || role === UserRole.TEACHER) {
			users.forEach((user) => {
				if (user.teacherAssignments && user.teacherAssignments.length > 0) {
					// Use teacherAssignments as source of truth - include semesterId from assignments
					const enrichedClasses = user.teacherAssignments.map((ta) => {
						const cls = ta.cls;
						(cls as any).semesterId = ta.semester?.id;
						return cls;
					});
					// Add back any teachingClasses that might not be in assignments (legacy)
					const assignedClassIds = new Set(enrichedClasses.map((c) => c.id));
					user.teachingClasses = [
						...enrichedClasses,
						...(user.teachingClasses || []).filter(
							(c) => !assignedClassIds.has(c.id)
						),
					];
				}
			});
		}

		return users;
	}

	async findOne(id: number): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: { id },
			relations: [
				"students",
				"students.semester",
				"students.class",
				"teachingClasses",
				"teacherAssignments",
				"teacherAssignments.semester",
				"teacherAssignments.cls",
			],
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Enrich teachingClasses with semesterId from teacherAssignments
		if (user.teacherAssignments && user.teacherAssignments.length > 0) {
			// Use teacherAssignments as source of truth - include semesterId from assignments
			const enrichedClasses = user.teacherAssignments.map((ta) => {
				const cls = ta.cls;
				(cls as any).semesterId = ta.semester?.id;
				return cls;
			});
			// Add back any teachingClasses that might not be in assignments (legacy)
			const assignedClassIds = new Set(enrichedClasses.map((c) => c.id));
			user.teachingClasses = [
				...enrichedClasses,
				...(user.teachingClasses || []).filter(
					(c) => !assignedClassIds.has(c.id)
				),
			];
		}

		return user;
	}

	async findByEmail(email: string, relations?: string[]): Promise<User | null> {
		return this.usersRepository.findOne({
			where: { email },
			relations: relations || [],
		});
	}

	async findByNis(nis: string): Promise<User | null> {
		return this.usersRepository.findOne({ where: { nis } });
	}

	async findByNip(nip: string): Promise<User | null> {
		return this.usersRepository.findOne({ where: { nip } });
	}

	async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
		const user = await this.findOne(id);

		// Check email uniqueness if email is being changed
		if (updateUserDto.email && updateUserDto.email !== user.email) {
			const existingByEmail = await this.usersRepository.findOne({
				where: { email: updateUserDto.email },
			});
			if (existingByEmail) {
				throw new ConflictException("Email already exists");
			}
		}

		// Check NIS uniqueness if NIS is being changed
		if (updateUserDto.nis && updateUserDto.nis !== user.nis) {
			const existingByNis = await this.usersRepository.findOne({
				where: { nis: updateUserDto.nis },
			});
			if (existingByNis) {
				throw new ConflictException("NIS already exists");
			}
		}

		// Check NIP uniqueness if NIP is being changed
		if (updateUserDto.nip && updateUserDto.nip !== user.nip) {
			const existingByNip = await this.usersRepository.findOne({
				where: { nip: updateUserDto.nip },
			});
			if (existingByNip) {
				throw new ConflictException("NIP already exists");
			}
		}

		// Check if role changed to student
		const wasNotStudent = user.role !== UserRole.STUDENT;
		const isNowStudent = updateUserDto.role === UserRole.STUDENT;

		Object.assign(user, updateUserDto);

		// Hash password if provided
		if (updateUserDto.password) {
			user.password = await bcrypt.hash(updateUserDto.password, 10);
		}

		const updatedUser = await this.usersRepository.save(user);

		// If role changed to student, create student record
		if (wasNotStudent && isNowStudent) {
			await this.createStudentRecordForActiveSemester(updatedUser.id);
		}

		return updatedUser;
	}

	async remove(id: number): Promise<void> {
		const user = await this.findOne(id);

		// Explicitly delete all student records first
		if (user.students && user.students.length > 0) {
			await this.studentsRepository.remove(user.students);
		}

		// Delete from teacher_subjects join table (many-to-many)
		await this.usersRepository
			.createQueryBuilder()
			.delete()
			.from("teacher_subjects")
			.where("teacherId = :teacherId", { teacherId: id })
			.execute();

		// Delete from class_teachers join table (many-to-many)
		await this.usersRepository
			.createQueryBuilder()
			.delete()
			.from("class_teachers")
			.where("teacherId = :teacherId", { teacherId: id })
			.execute();

		await this.usersRepository.remove(user);
	}

	// Assign teacher to classes for a given semester (or active semester if not provided)
	// Allows multiple class assignments per teacher per semester (teaching roles).
	async assignTeacherToClass(
		teacherId: number,
		classIds: number[],
		semesterId?: number
	): Promise<any> {
		const user = await this.usersRepository.findOne({
			where: { id: teacherId },
		});

		if (!user) {
			throw new NotFoundException("Teacher not found");
		}

		if (user.role !== UserRole.TEACHER) {
			throw new ConflictException("User is not a teacher");
		}

		// Determine semester
		let semester: Semester | undefined;
		if (semesterId) {
			semester = await this.semestersRepository.findOne({
				where: { id: semesterId },
			});
			if (!semester) throw new NotFoundException("Semester not found");
		} else {
			semester = await this.semestersRepository.findOne({
				where: { isActive: true },
			});
			if (!semester)
				throw new ConflictException("No active semester configured");
		}

		// If clearing assignment for semester
		if (classIds.length === 0) {
			try {
				await this.teacherAssignmentsRepository.delete({
					teacher: { id: teacherId } as any,
					semester: { id: semester.id } as any,
				} as any);
				return this.getTeacherWithClasses(teacherId, semester.id);
			} catch (err) {
				if (
					err instanceof QueryFailedError ||
					String(err).includes("teacher_assignments")
				) {
					await this.fallbackClearTeacherClassesForSemester(
						teacherId,
						semester.id
					);
					return this.getTeacherWithClasses(teacherId, semester.id);
				}
				throw err;
			}
		}

		// Validate all target classes and ensure they belong to the semester (if class has semesterId)
		const uniqueClassIds = Array.from(new Set(classIds));
		const targetClasses = [] as Class[];
		for (const cid of uniqueClassIds) {
			const cls = await this.classesRepository.findOne({ where: { id: cid } });
			if (!cls) throw new NotFoundException(`Class not found: ${cid}`);
			if (cls.semesterId && cls.semesterId !== semester.id) {
				throw new ConflictException(
					`Class ${cid} does not belong to the selected semester`
				);
			}
			targetClasses.push(cls);
		}

		// Fetch existing assignments for this teacher & semester
		let existingAssignments: any[] = [];
		try {
			existingAssignments = await this.teacherAssignmentsRepository.find({
				where: {
					teacher: { id: teacherId } as any,
					semester: { id: semester.id } as any,
				},
			});
		} catch (err) {
			if (
				err instanceof QueryFailedError ||
				String(err).includes("teacher_assignments")
			) {
				// Fallback to legacy join table behavior
				await this.fallbackSyncTeacherClassesUsingJoinTable(
					teacherId,
					new Set(uniqueClassIds),
					semester.id
				);
				return this.getTeacherWithClasses(teacherId, semester.id);
			}
			throw err;
		}

		const existingClassIds = new Set(existingAssignments.map((a) => a.cls.id));
		const wantedClassIds = new Set(targetClasses.map((c) => c.id));

		// Delete assignments that are not desired anymore
		for (const a of existingAssignments) {
			if (!wantedClassIds.has(a.cls.id)) {
				await this.teacherAssignmentsRepository.delete({ id: a.id } as any);
			}
		}

		// Create assignments that don't exist yet
		for (const cls of targetClasses) {
			if (!existingClassIds.has(cls.id)) {
				const assignment = this.teacherAssignmentsRepository.create({
					teacher: user as any,
					cls: cls as any,
					semester: semester as any,
				} as any);
				await this.teacherAssignmentsRepository.save(assignment);
			}
		}

		return this.getTeacherWithClasses(teacherId, semester.id);
	}

	// Get teacher with their assigned classes
	async getTeacherWithClasses(
		teacherId: number,
		semesterId?: number
	): Promise<any> {
		const user = await this.usersRepository.findOne({
			where: { id: teacherId },
		});

		if (!user) throw new NotFoundException("Teacher not found");

		// If semesterId not provided use active semester
		let semester: Semester | undefined;
		if (semesterId) {
			semester = await this.semestersRepository.findOne({
				where: { id: semesterId },
			});
		} else {
			semester = await this.semestersRepository.findOne({
				where: { isActive: true },
			});
		}

		let classes: Class[] = [];
		try {
			const assignments = await this.teacherAssignmentsRepository.find({
				where: semester
					? {
							teacher: { id: teacherId } as any,
							semester: { id: semester.id } as any,
						}
					: { teacher: { id: teacherId } as any },
			});
			classes = assignments.map((a) => a.cls);
		} catch (err) {
			if (
				err instanceof QueryFailedError ||
				String(err).includes("teacher_assignments")
			) {
				// Fallback to legacy many-to-many join table on classes
				const allClasses = await this.classesRepository.find({
					relations: ["teachers"],
				});
				classes = allClasses.filter(
					(c) =>
						c.teachers &&
						c.teachers.some((t) => t.id === teacherId) &&
						(semester ? c.semesterId === semester.id : true)
				);
			} else {
				throw err;
			}
		}

		return {
			teacher: {
				id: user.id,
				name: user.name,
				email: user.email,
				nip: (user as any).nip,
				role: user.role,
				isActive: user.isActive,
			},
			teachingClasses: classes,
			semester: semester
				? { id: semester.id, name: semester.name, year: semester.year }
				: null,
		};
	}

	// Aggregate recent activities for a user: submissions (taking exams) and question-bank creations
	async getUserActivities(userId: number): Promise<any[]> {
		// Recent submissions by this user's student records
		const submissions = await this.submissionsRepository
			.createQueryBuilder("sub")
			.leftJoinAndSelect("sub.student", "student")
			.leftJoinAndSelect("sub.exam", "exam")
			.where("student.userId = :userId", { userId })
			.select([
				"sub.id",
				"sub.submittedAt",
				"sub.createdAt",
				"exam.id",
				"exam.title",
			])
			.orderBy("sub.createdAt", "DESC")
			.take(10)
			.getRawMany();

		const subActivities = submissions.map((s: any) => ({
			type: "submission",
			action: s.sub_submittedAt ? "Submitted Exam" : "Started Exam",
			resource: { id: s.exam_id, title: s.exam_title },
			date: s.sub_createdAt || s.sub_submittedAt,
		}));

		// Recent question bank items created by this user
		const qbs = await this.questionBankRepository.find({
			where: { createdById: userId },
			order: { createdAt: "DESC" },
			take: 10,
		});

		const qbActivities = qbs.map((q) => ({
			type: "question_bank",
			action: "Created Question",
			resource: { id: q.id, text: q.questionText },
			date: q.createdAt,
		}));

		// Merge and sort by date desc
		const all = [...subActivities, ...qbActivities].sort(
			(a: any, b: any) =>
				new Date(b.date).getTime() - new Date(a.date).getTime()
		);

		return all.slice(0, 20);
	}
}
