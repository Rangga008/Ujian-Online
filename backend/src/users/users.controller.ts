import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { StudentsService } from "../students/students.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "./user.entity";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly studentsService: StudentsService
	) {}

	@Post()
	@Roles(UserRole.ADMIN)
	create(@Body() createUserDto: CreateUserDto) {
		return this.usersService.create(createUserDto);
	}

	@Get()
	@Roles(UserRole.ADMIN)
	findAll(@Query("role") role?: UserRole) {
		return this.usersService.findAll(role);
	}

	// List users with their active semester student and class
	@Get("with-active-student")
	@Roles(UserRole.ADMIN)
	async listWithActiveStudent(@Query("role") role?: UserRole) {
		const users = await this.usersService.findAll(role);
		const activeSemester = await this.studentsService[
			"semestersRepository"
		].findOne({
			where: { isActive: true },
		});
		const semesterId = activeSemester?.id;

		return users.map((u) => {
			const activeStudent =
				u.students?.find((s: any) => s.semesterId === semesterId) || null;
			return {
				user: {
					id: u.id,
					name: u.name,
					email: u.email,
					nis: (u as any).nis,
					nip: (u as any).nip,
					role: u.role,
					isActive: u.isActive,
				},
				student: activeStudent,
				class: activeStudent?.class
					? {
							id: activeStudent.class.id,
							name: activeStudent.class.name,
							grade: activeStudent.class.grade,
							major: activeStudent.class.major,
						}
					: null,
			};
		});
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.usersService.findOne(+id);
	}

	@Put(":id")
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
		return this.usersService.update(+id, updateUserDto);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.usersService.remove(+id);
	}
}
