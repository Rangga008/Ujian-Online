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
	Patch,
} from "@nestjs/common";
import { ExamsService } from "./exams.service";
import { CreateExamDto, UpdateExamDto } from "./dto/exam.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { ExamStatus } from "./exam.entity";

@Controller("exams")
@UseGuards(JwtAuthGuard)
export class ExamsController {
	constructor(private readonly examsService: ExamsService) {}

	@Post()
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	create(@Body() createExamDto: CreateExamDto) {
		return this.examsService.create(createExamDto);
	}

	@Get()
	findAll(@Query("status") status?: ExamStatus) {
		return this.examsService.findAll(status);
	}

	@Get("active")
	@Roles(UserRole.STUDENT)
	findActiveExams() {
		return this.examsService.findActiveExams();
	}

	@Get("class/:classId")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findByClass(@Param("classId") classId: string) {
		return this.examsService.findByClass(+classId);
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.examsService.findOne(+id);
	}

	@Put(":id")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateExamDto: UpdateExamDto) {
		return this.examsService.update(+id, updateExamDto);
	}

	@Patch(":id/status")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	updateStatus(@Param("id") id: string, @Body("status") status: ExamStatus) {
		return this.examsService.updateStatus(+id, status);
	}

	@Delete(":id")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.examsService.remove(+id);
	}
}
