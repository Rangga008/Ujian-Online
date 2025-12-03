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

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		// Check for unique email
		const existingByEmail = await this.usersRepository.findOne({
			where: { email: createUserDto.email },
		});

		if (existingByEmail) {
			throw new ConflictException("Email already exists");
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
			await this.createStudentRecordForActiveSemester(savedUser.id);
		}

		return savedUser;
	}

	private async createStudentRecordForActiveSemester(
		userId: number
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
			name: user.name, // Use user's name
			isActive: true,
		});

		await this.studentsRepository.save(student);
	}

	async findAll(role?: UserRole): Promise<User[]> {
		const where: any = {};
		if (role) where.role = role;

		return this.usersRepository.find({
			where,
			relations: ["students"],
			order: { name: "ASC" },
		});
	}

	async findOne(id: number): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: { id },
			relations: ["students", "students.semester", "students.class"],
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return user;
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.usersRepository.findOne({ where: { email } });
	}

	async findByNis(nis: string): Promise<User | null> {
		return this.usersRepository.findOne({ where: { nis } });
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

		await this.usersRepository.remove(user);
	}
}
