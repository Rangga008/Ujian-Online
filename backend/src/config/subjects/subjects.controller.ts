import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
} from "@nestjs/common";
import { SubjectsService } from "./subjects.service";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("subjects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
	constructor(private readonly subjectsService: SubjectsService) {}

	@Post()
	@Roles(UserRole.ADMIN)
	create(@Body() createSubjectDto: CreateSubjectDto) {
		return this.subjectsService.create(createSubjectDto);
	}

	@Get()
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findAll() {
		return this.subjectsService.findAll();
	}

	@Get("teacher/:teacherId")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findByTeacher(@Param("teacherId") teacherId: string) {
		return this.subjectsService.findByTeacher(+teacherId);
	}

	@Get(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findOne(@Param("id") id: string) {
		return this.subjectsService.findOne(+id);
	}

	@Patch(":id")
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
		return this.subjectsService.update(+id, updateSubjectDto);
	}

	@Patch(":id/teachers")
	@Roles(UserRole.ADMIN)
	assignTeachers(
		@Param("id") id: string,
		@Body("teacherIds") teacherIds: number[]
	) {
		return this.subjectsService.assignTeachers(+id, teacherIds);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.subjectsService.remove(+id);
	}
}
