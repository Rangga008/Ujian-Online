import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Student } from "../students/student.entity";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>
	) {}

	async validateUser(email: string, password: string): Promise<any> {
		const user = await this.usersService.findByEmail(email);
		if (user && (await bcrypt.compare(password, user.password))) {
			const { password, ...result } = user;
			return result;
		}
		return null;
	}

	async validateUserByNis(nis: string, password: string): Promise<any> {
		const user = await this.usersService.findByNis(nis);
		if (user && (await bcrypt.compare(password, user.password))) {
			const { password, ...result } = user;
			return result;
		}
		return null;
	}

	async validateUserByNip(nip: string, password: string): Promise<any> {
		const user = await this.usersService.findByNip(nip);
		if (user && (await bcrypt.compare(password, user.password))) {
			const { password, ...result } = user;
			return result;
		}
		return null;
	}

	async login(user: any) {
		const payload = {
			email: user.email,
			sub: user.id,
			role: user.role,
			classId: user.classId || null,
		};
		return {
			access_token: this.jwtService.sign(payload),
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				studentName: user.studentName, // Actual student name
				role: user.role,
				nis: user.nis,
				kelas: user.kelas,
				jurusan: user.jurusan,
				classId: user.classId,
				class: user.class,
				semester: user.semester,
				semesterId: user.semesterId,
				teachingClasses: user.teachingClasses || [],
			},
		};
	}

	async loginStudent(nis: string, password: string) {
		const user = await this.validateUserByNis(nis, password);
		if (!user) {
			throw new UnauthorizedException("NIS atau password salah");
		}
		if (user.role !== "student") {
			throw new UnauthorizedException("Akun ini bukan akun siswa");
		}

		// Fetch student info with class and subjects
		const student = await this.studentsRepository.findOne({
			where: { userId: user.id },
			relations: ["class", "class.subjects", "semester"],
		});

		console.log(
			`👨‍🎓 loginStudent - userId: ${user.id}, student: ${JSON.stringify(student)}`
		);

		// Add student and class info to user object
		const userWithClass = {
			...user,
			studentName: student?.name, // Nama sebenarnya siswa
			kelas: student?.class?.name,
			jurusan: student?.class?.major, // Mapel/Jurusan dari class
			class: student?.class,
			classId: student?.classId,
			semester: student?.semester,
			semesterId: student?.semesterId,
		};

		console.log(
			`📝 userWithClass after adding student info: classId=${userWithClass.classId}`
		);

		return this.login(userWithClass);
	}

	async loginAdmin(email: string, password: string) {
		const user = await this.usersService.findByEmail(email, [
			"teachingClasses",
		]);
		if (!user) {
			throw new UnauthorizedException("Email atau password salah");
		}
		if (!(await bcrypt.compare(password, user.password))) {
			throw new UnauthorizedException("Email atau password salah");
		}
		if (user.role !== "admin" && user.role !== "teacher") {
			throw new UnauthorizedException(
				"Akun ini tidak memiliki akses ke admin panel"
			);
		}
		const { password: _, ...userWithoutPassword } = user;
		return this.login(userWithoutPassword);
	}

	async loginAdminByNip(nip: string, password: string) {
		const user = await this.usersService.findByNip(nip);
		if (!user) {
			throw new UnauthorizedException("NIP atau password salah");
		}
		if (!(await bcrypt.compare(password, user.password))) {
			throw new UnauthorizedException("NIP atau password salah");
		}
		if (user.role !== "admin" && user.role !== "teacher") {
			throw new UnauthorizedException(
				"Akun ini tidak memiliki akses ke admin panel"
			);
		}
		const { password: _, ...userWithoutPassword } = user as any;
		// ensure teachingClasses relation loaded
		if (!(userWithoutPassword as any).teachingClasses) {
			const fresh = await this.usersService.findByEmail(user.email, [
				"teachingClasses",
			]);
			return this.login(fresh as any);
		}
		return this.login(userWithoutPassword);
	}
}
