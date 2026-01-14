import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "./student.entity";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { User, UserRole } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { Submission } from "../submissions/submission.entity";

@Injectable()
export class StudentsService {
	constructor(
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>,
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>,
		@InjectRepository(Class)
		private classesRepository: Repository<Class>,
		@InjectRepository(Submission)
		private submissionRepository: Repository<Submission>
	) {}

	async create(createStudentDto: CreateStudentDto): Promise<Student> {
		// Verify user exists
		const user = await this.usersRepository.findOne({
			where: { id: createStudentDto.userId },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Verify semester exists
		const semester = await this.semestersRepository.findOne({
			where: { id: createStudentDto.semesterId },
		});
		if (!semester) {
			throw new NotFoundException("Semester not found");
		}

		// Check if student already exists for this user in this semester
		const existing = await this.studentsRepository.findOne({
			where: {
				userId: createStudentDto.userId,
				semesterId: createStudentDto.semesterId,
			},
		});

		if (existing) {
			throw new ConflictException(
				"Student data already exists for this user in this semester"
			);
		}

		const student = this.studentsRepository.create(createStudentDto);
		return this.studentsRepository.save(student);
	}

	async findAll(semesterId?: number, classId?: number): Promise<Student[]> {
		const where: any = {};
		if (semesterId) where.semesterId = semesterId;
		if (classId) where.classId = classId;

		return this.studentsRepository.find({
			where,
			relations: ["user", "semester", "class"],
			order: { name: "ASC" },
		});
	}

	async findOne(id: number): Promise<Student> {
		const student = await this.studentsRepository.findOne({
			where: { id },
			relations: ["user", "semester", "class"],
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		return student;
	}

	async findByUser(userId: number, semesterId?: number): Promise<Student[]> {
		const where: any = { userId };
		if (semesterId) where.semesterId = semesterId;

		return this.studentsRepository.find({
			where,
			relations: ["semester", "class"],
		});
	}

	async findByUserAndActiveSemester(userId: number): Promise<Student | null> {
		const activeSemester = await this.semestersRepository.findOne({
			where: { isActive: true },
		});

		if (!activeSemester) {
			return null;
		}

		return this.studentsRepository.findOne({
			where: {
				userId,
				semesterId: activeSemester.id,
			},
			relations: ["semester", "class", "user"],
		});
	}

	async update(
		id: number,
		updateStudentDto: UpdateStudentDto
	): Promise<Student> {
		const student = await this.studentsRepository.findOne({
			where: { id },
			relations: ["user", "semester", "class"],
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		// If changing semester, check for conflicts
		if (
			updateStudentDto.semesterId &&
			updateStudentDto.semesterId !== student.semesterId
		) {
			const existing = await this.studentsRepository.findOne({
				where: {
					userId: student.userId,
					semesterId: updateStudentDto.semesterId,
				},
			});

			if (existing && existing.id !== id) {
				throw new ConflictException(
					"Student data already exists for this user in the target semester"
				);
			}
		}

		// If changing classId, validate that class belongs to student's semester
		if (updateStudentDto.classId !== undefined) {
			if (updateStudentDto.classId !== null) {
				const classEntity = await this.classesRepository.findOne({
					where: { id: updateStudentDto.classId },
				});

				if (!classEntity) {
					throw new NotFoundException("Class not found");
				}

				// Validate class belongs to student's semester
				if (classEntity.semesterId !== student.semesterId) {
					throw new ConflictException(
						`Class does not belong to student's semester. Student semester: ${student.semesterId}, Class semester: ${classEntity.semesterId}`
					);
				}
			}

			if (updateStudentDto.classId === null) {
			}

			// Clear stale relation to avoid returning outdated class in response
			// TypeORM may keep the previous relation loaded; when changing FK, reset relation.
			if (
				updateStudentDto.classId === null ||
				updateStudentDto.classId !== student.classId
			) {
				student.class = null;
			}
		}

		Object.assign(student, updateStudentDto);

		const saved = await this.studentsRepository.save(student);

		// Reload with relations to ensure response reflects updated class
		const reloaded = await this.studentsRepository.findOne({
			where: { id: saved.id },
			relations: ["user", "semester", "class"],
		});

		return reloaded ?? saved;
	}

	async remove(id: number): Promise<void> {
		const student = await this.findOne(id);

		// Delete all submissions for this student first
		await this.submissionRepository.delete({ studentId: student.id });

		// Then delete the student
		await this.studentsRepository.remove(student);
	}

	// Sync student active status based on active semester
	async syncStudentActiveStatus(): Promise<void> {
		const activeSemester = await this.semestersRepository.findOne({
			where: { isActive: true },
		});

		const allStudents = await this.studentsRepository.find();

		for (const student of allStudents) {
			const shouldBeActive =
				activeSemester && student.semesterId === activeSemester.id;
			if (student.isActive !== shouldBeActive) {
				await this.studentsRepository.update(student.id, {
					isActive: shouldBeActive,
				});
			}
		}
	}

	async importStudents(
		data: any[],
		semesterId: number,
		classId?: number
	): Promise<{
		success: number;
		skipped: number;
		failed: number;
		newUsers: number;
		existingUsers: number;
		errors: string[];
		warnings: string[];
	}> {
		// Verify semester exists
		const semester = await this.semestersRepository.findOne({
			where: { id: semesterId },
		});
		if (!semester) {
			throw new NotFoundException("Semester tidak ditemukan");
		}

		// Verify class if provided
		if (classId) {
			const classEntity = await this.classesRepository.findOne({
				where: { id: classId },
			});
			if (!classEntity) {
				throw new NotFoundException("Kelas tidak ditemukan");
			}
			if (classEntity.semesterId !== semesterId) {
				throw new ConflictException(
					"Kelas tidak sesuai dengan semester yang dipilih"
				);
			}
		}

		let success = 0;
		let skipped = 0;
		let failed = 0;
		const errors: string[] = [];
		const warnings: string[] = [];
		let newUsers = 0;
		let existingUsers = 0;

		for (let i = 0; i < data.length; i++) {
			const row = data[i];
			const rowNumber = i + 2; // Excel row number (header is row 1)

			try {
				const name = row["Nama"]?.toString().trim();
				const email = row["Email"]?.toString().trim().toLowerCase() || null;
				const nis = row["NIS"]?.toString().trim();
				const password = row["Password"]?.toString().trim();

				// Validate required fields (email is optional now)
				if (!name || !nis || !password) {
					errors.push(
						`Baris ${rowNumber}: Data tidak lengkap (${!name ? "Nama, " : ""}${!nis ? "NIS, " : ""}${!password ? "Password" : ""})`
					);
					failed++;
					continue;
				}

				// Validate email format only if provided
				if (email) {
					const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
					if (!emailRegex.test(email)) {
						errors.push(
							`Baris ${rowNumber}: Format email tidak valid (${email})`
						);
						failed++;
						continue;
					}
				}

				// Check if user already exists by email (if provided) or NIS
				const whereConditions: any = [{ nis }];
				if (email) {
					whereConditions.push({ email });
				}

				let user = await this.usersRepository.findOne({
					where: whereConditions,
				});

				if (user) {
					// Check if student record exists for this semester
					const existingStudent = await this.studentsRepository.findOne({
						where: {
							userId: user.id,
							semesterId: semesterId,
						},
					});

					if (existingStudent) {
						errors.push(
							`Baris ${rowNumber}: Siswa ${name} (${nis}) sudah terdaftar di semester ini`
						);
						skipped++;
						continue;
					}

					// User exists, add student record for this semester
					existingUsers++;
					warnings.push(
						`Baris ${rowNumber}: User ${name} (${nis}) sudah ada, menambahkan data siswa ke semester ini`
					);

					const student = this.studentsRepository.create({
						userId: user.id,
						semesterId: semesterId,
						classId: classId || null,
						name: name,
						isActive: semester.isActive,
					});
					await this.studentsRepository.save(student);
					success++;
				} else {
					// Create new user and student record
					newUsers++;
					user = this.usersRepository.create({
						name,
						email,
						nis,
						password, // Will be hashed by User entity
						role: UserRole.STUDENT,
						isActive: true,
					});
					await this.usersRepository.save(user);

					// Create student record
					const student = this.studentsRepository.create({
						userId: user.id,
						semesterId: semesterId,
						classId: classId || null,
						name: name,
						isActive: semester.isActive,
					});
					await this.studentsRepository.save(student);
					success++;
				}
			} catch (error) {
				errors.push(`Baris ${rowNumber}: ${error.message}`);
				failed++;
			}
		}

		return {
			success,
			skipped,
			failed,
			newUsers,
			existingUsers,
			errors,
			warnings,
		};
	}
}
