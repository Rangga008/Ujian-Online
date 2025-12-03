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
import { User } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";

@Injectable()
export class StudentsService {
	constructor(
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>,
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>
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

		Object.assign(student, updateStudentDto);
		return this.studentsRepository.save(student);
	}

	async remove(id: number): Promise<void> {
		const student = await this.findOne(id);
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
}
