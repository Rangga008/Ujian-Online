import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Query,
} from "@nestjs/common";
import { ClassesService } from "./classes.service";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("classes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
	constructor(private readonly classesService: ClassesService) {}

	@Post()
	@Roles(UserRole.ADMIN)
	create(@Body() createClassDto: CreateClassDto) {
		return this.classesService.create(createClassDto);
	}

	@Get()
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findAll(@Query("semesterId") semesterId?: string) {
		return this.classesService.findAll(semesterId ? +semesterId : undefined);
	}

	@Get("grade/:grade")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findByGrade(@Param("grade") grade: string) {
		return this.classesService.findByGrade(+grade);
	}

	@Get("teacher/:teacherId")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findByTeacher(@Param("teacherId") teacherId: string) {
		return this.classesService.findByTeacher(+teacherId);
	}

	@Get("active-semester")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findByActiveSemester() {
		return this.classesService.findByActiveSemester();
	}

	@Get(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findOne(@Param("id") id: string) {
		return this.classesService.findOne(+id);
	}

	@Get(":id/student-count")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	getStudentCount(@Param("id") id: string) {
		return this.classesService.getStudentCount(+id);
	}

	@Patch(":id")
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateClassDto: UpdateClassDto) {
		return this.classesService.update(+id, updateClassDto);
	}

	@Patch(":id/teachers")
	@Roles(UserRole.ADMIN)
	assignTeachers(
		@Param("id") id: string,
		@Body("teacherIds") teacherIds: number[]
	) {
		return this.classesService.assignTeachers(+id, teacherIds);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.classesService.remove(+id);
	}
}
