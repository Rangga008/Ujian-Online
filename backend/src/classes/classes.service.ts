import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Class } from "./class.entity";
import { User, UserRole } from "../users/user.entity";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { Semester } from "../semesters/semester.entity";
import { Student } from "../students/student.entity";
import { Subject } from "../subjects/subject.entity";

@Injectable()
export class ClassesService {
	constructor(
		@InjectRepository(Class)
		private classRepository: Repository<Class>,
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Student)
		private studentRepository: Repository<Student>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>,
		@InjectRepository(Subject)
		private subjectRepository: Repository<Subject>
	) {}

	async create(createClassDto: CreateClassDto): Promise<Class> {
		const { teacherIds, subjectIds, ...classData } = createClassDto;

		// Auto assign active semester if exists and not provided explicitly
		if (!("semesterId" in classData) || !classData["semesterId"]) {
			const activeSemester = await this.semestersRepository.findOne({
				where: { isActive: true },
			});
			if (activeSemester) {
				(classData as any).semesterId = activeSemester.id;
				// Don't override academicYear if already provided
				if (!classData.academicYear) {
					// Extract year number from semester year string (e.g., 2026 from "2025/2026")
					const yearMatch = activeSemester.year.match(/\d{4}(?!.*\d{4})/);
					(classData as any).academicYear = yearMatch
						? parseInt(yearMatch[0])
						: new Date().getFullYear();
				}
			}
		}

		const classEntity = this.classRepository.create(classData as any);

		if (teacherIds && teacherIds.length > 0) {
			if (teacherIds.length > 1) {
				throw new ConflictException(
					"Satu guru hanya bisa menjadi wali untuk satu kelas"
				);
			}

			const teacher = await this.userRepository.findOne({
				where: { id: teacherIds[0], role: UserRole.TEACHER },
			});

			if (!teacher) {
				throw new NotFoundException("Guru tidak ditemukan");
			}

			const existingClass = await this.classRepository
				.createQueryBuilder("class")
				.leftJoin("class.teachers", "teacher")
				.where("teacher.id = :teacherId", { teacherId: teacher.id })
				.getOne();

			if (existingClass) {
				throw new ConflictException("Guru sudah menjadi wali di kelas lain");
			}

			(classEntity as any).teachers = [teacher];
		}

		if (subjectIds && subjectIds.length > 0) {
			const subjects = await this.subjectRepository.find({
				where: { id: In(subjectIds), isActive: true },
			});
			(classEntity as any).subjects = subjects;
		}

		return (await this.classRepository.save(classEntity)) as any;
	}
	async findAll(semesterId?: number): Promise<Class[]> {
		const where: any = {};
		if (semesterId) {
			where.semesterId = semesterId;
		}
		return await this.classRepository.find({
			where,
			relations: ["students", "teachers", "semester", "subjects"],
			order: { grade: "ASC", name: "ASC" },
		});
	}

	async findOne(id: number): Promise<Class> {
		const classEntity = await this.classRepository.findOne({
			where: { id },
			relations: [
				"students",
				"students.user",
				"teachers",
				"semester",
				"subjects",
			],
		});

		if (!classEntity) {
			throw new NotFoundException(`Class with ID ${id} not found`);
		}

		return classEntity;
	}

	async findByGrade(grade: number): Promise<Class[]> {
		return await this.classRepository.find({
			where: { grade, isActive: true },
			relations: ["students", "teachers", "semester", "subjects"],
			order: { name: "ASC" },
		});
	}

	async findByTeacher(teacherId: number): Promise<Class[]> {
		return await this.classRepository
			.createQueryBuilder("class")
			.leftJoinAndSelect("class.teachers", "teacher")
			.leftJoinAndSelect("class.students", "student")
			.leftJoinAndSelect("class.semester", "semester")
			.leftJoinAndSelect("class.subjects", "subject")
			.where("teacher.id = :teacherId", { teacherId })
			.getMany();
	}

	async update(id: number, updateClassDto: UpdateClassDto): Promise<Class> {
		const classEntity = await this.findOne(id);
		const { teacherIds, subjectIds, ...classData } =
			updateClassDto as UpdateClassDto & {
				teacherIds?: number[];
				subjectIds?: number[];
			};

		Object.assign(classEntity, classData);

		if (teacherIds !== undefined) {
			if (teacherIds.length > 1) {
				throw new ConflictException(
					"Satu guru hanya bisa menjadi wali untuk satu kelas"
				);
			}

			if (teacherIds.length === 0) {
				classEntity.teachers = [];
			} else {
				const teacher = await this.userRepository.findOne({
					where: { id: teacherIds[0], role: UserRole.TEACHER },
				});

				if (!teacher) {
					throw new NotFoundException("Guru tidak ditemukan");
				}

				const existingClass = await this.classRepository
					.createQueryBuilder("class")
					.leftJoin("class.teachers", "teacher")
					.where("teacher.id = :teacherId", { teacherId: teacher.id })
					.andWhere("class.id != :classId", { classId: id })
					.getOne();

				if (existingClass) {
					throw new ConflictException("Guru sudah menjadi wali di kelas lain");
				}

				classEntity.teachers = [teacher];
			}
		}

		if (subjectIds !== undefined) {
			if (subjectIds.length > 0) {
				const subjects = await this.subjectRepository.find({
					where: { id: In(subjectIds), isActive: true },
				});
				classEntity.subjects = subjects;
			} else {
				classEntity.subjects = [];
			}
		}

		return await this.classRepository.save(classEntity);
	}

	async remove(id: number): Promise<void> {
		const classEntity = await this.findOne(id);

		// Check if there are students in the class
		if (classEntity.students && classEntity.students.length > 0) {
			// Set students' classId to null before deleting
			await this.studentRepository.update({ classId: id }, { classId: null });
		}

		await this.classRepository.remove(classEntity);
	}

	async assignTeachers(classId: number, teacherIds: number[]): Promise<Class> {
		const classEntity = await this.findOne(classId);

		if (teacherIds.length > 1) {
			throw new ConflictException(
				"Satu guru hanya bisa menjadi wali untuk satu kelas"
			);
		}

		if (teacherIds.length === 0) {
			classEntity.teachers = [];
			return await this.classRepository.save(classEntity);
		}

		const teacher = await this.userRepository.findOne({
			where: { id: teacherIds[0], role: UserRole.TEACHER },
		});

		if (!teacher) {
			throw new NotFoundException("Guru tidak ditemukan");
		}

		const existingClass = await this.classRepository
			.createQueryBuilder("class")
			.leftJoin("class.teachers", "teacher")
			.where("teacher.id = :teacherId", { teacherId: teacher.id })
			.andWhere("class.id != :classId", { classId })
			.getOne();

		if (existingClass) {
			throw new ConflictException("Guru sudah menjadi wali di kelas lain");
		}

		classEntity.teachers = [teacher];
		return await this.classRepository.save(classEntity);
	}

	async getStudentCount(classId: number): Promise<number> {
		const classEntity = await this.findOne(classId);
		return classEntity.students ? classEntity.students.length : 0;
	}

	async findByActiveSemester(): Promise<Class[]> {
		const activeSemester = await this.semestersRepository.findOne({
			where: { isActive: true },
		});
		if (!activeSemester) return [];
		return this.classRepository.find({
			where: { semesterId: activeSemester.id },
			relations: ["students", "teachers", "semester", "subjects"],
			order: { grade: "ASC", name: "ASC" },
		});
	}

	async assignSubjects(classId: number, subjectIds: number[]): Promise<Class> {
		const classEntity = await this.findOne(classId);

		const subjects = await this.subjectRepository.find({
			where: { id: In(subjectIds), isActive: true },
		});

		classEntity.subjects = subjects;
		return await this.classRepository.save(classEntity);
	}

	async findBySubject(subjectId: number): Promise<Class[]> {
		return await this.classRepository
			.createQueryBuilder("class")
			.leftJoinAndSelect("class.subjects", "subject")
			.leftJoinAndSelect("class.students", "student")
			.leftJoinAndSelect("class.teachers", "teacher")
			.leftJoinAndSelect("class.semester", "semester")
			.where("subject.id = :subjectId", { subjectId })
			.andWhere("class.isActive = :isActive", { isActive: true })
			.orderBy("class.grade", "ASC")
			.addOrderBy("class.name", "ASC")
			.getMany();
	}
}
