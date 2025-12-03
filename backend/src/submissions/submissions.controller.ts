import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	UseGuards,
	Request,
} from "@nestjs/common";
import { SubmissionsService } from "./submissions.service";
import { SubmitAnswerDto } from "./dto/submission.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("submissions")
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
	constructor(private readonly submissionsService: SubmissionsService) {}

	@Post("start/:examId")
	@Roles(UserRole.STUDENT)
	@UseGuards(RolesGuard)
	async startExam(@Param("examId") examId: string, @Request() req) {
		const studentId = await this.submissionsService.getStudentIdFromUserId(
			req.user.userId
		);
		return this.submissionsService.startExam(studentId, +examId);
	}

	@Post(":id/answer")
	@Roles(UserRole.STUDENT)
	@UseGuards(RolesGuard)
	submitAnswer(
		@Param("id") id: string,
		@Body() submitAnswerDto: SubmitAnswerDto
	) {
		return this.submissionsService.submitAnswer(+id, submitAnswerDto);
	}

	@Post(":id/submit")
	@Roles(UserRole.STUDENT)
	@UseGuards(RolesGuard)
	async submitExam(@Param("id") id: string, @Request() req) {
		const studentId = await this.submissionsService.getStudentIdFromUserId(
			req.user.userId
		);
		return this.submissionsService.submitExam(+id, studentId);
	}

	@Get("my-submissions")
	@Roles(UserRole.STUDENT)
	@UseGuards(RolesGuard)
	getMySubmissions(@Request() req) {
		return this.submissionsService.findByUserId(req.user.userId);
	}

	@Get("exam/:examId")
	@Roles(UserRole.ADMIN)
	@UseGuards(RolesGuard)
	getExamSubmissions(@Param("examId") examId: string) {
		return this.submissionsService.findByExam(+examId);
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.submissionsService.findOne(+id);
	}
}
