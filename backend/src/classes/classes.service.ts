import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Class } from "./class.entity";
import { User, UserRole } from "../users/user.entity";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { Semester } from "../semesters/semester.entity";
import { Student } from "../students/student.entity";

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
		private semestersRepository: Repository<Semester>
	) {}

	async create(createClassDto: CreateClassDto): Promise<Class> {
		const { teacherIds, ...classData } = createClassDto;

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
			const teachers = await this.userRepository.find({
				where: { id: In(teacherIds), role: UserRole.TEACHER },
			});
			(classEntity as any).teachers = teachers;
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
			relations: ["students", "teachers", "semester"],
			order: { grade: "ASC", name: "ASC" },
		});
	}

	async findOne(id: number): Promise<Class> {
		const classEntity = await this.classRepository.findOne({
			where: { id },
			relations: ["students", "teachers", "semester"],
		});

		if (!classEntity) {
			throw new NotFoundException(`Class with ID ${id} not found`);
		}

		return classEntity;
	}

	async findByGrade(grade: number): Promise<Class[]> {
		return await this.classRepository.find({
			where: { grade, isActive: true },
			relations: ["students", "teachers", "semester"],
			order: { name: "ASC" },
		});
	}

	async findByTeacher(teacherId: number): Promise<Class[]> {
		return await this.classRepository
			.createQueryBuilder("class")
			.leftJoinAndSelect("class.teachers", "teacher")
			.leftJoinAndSelect("class.students", "student")
			.leftJoinAndSelect("class.semester", "semester")
			.where("teacher.id = :teacherId", { teacherId })
			.getMany();
	}

	async update(id: number, updateClassDto: UpdateClassDto): Promise<Class> {
		const classEntity = await this.findOne(id);
		const { teacherIds, ...classData } = updateClassDto as UpdateClassDto & {
			teacherIds?: number[];
		};

		Object.assign(classEntity, classData);

		if (teacherIds !== undefined) {
			if (teacherIds.length > 0) {
				const teachers = await this.userRepository.find({
					where: { id: In(teacherIds), role: UserRole.TEACHER },
				});
				classEntity.teachers = teachers;
			} else {
				classEntity.teachers = [];
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

		const teachers = await this.userRepository.find({
			where: { id: In(teacherIds), role: UserRole.TEACHER },
		});

		classEntity.teachers = teachers;
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
			relations: ["students", "teachers", "semester"],
			order: { grade: "ASC", name: "ASC" },
		});
	}
}
