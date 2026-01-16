import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	UseGuards,
	Request,
	Patch,
} from "@nestjs/common";
import { SubmissionsService } from "./submissions.service";
import { SubmitAnswerDto } from "./dto/submission.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { Query, Header } from "@nestjs/common";

@Controller("submissions")
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
	constructor(private readonly submissionsService: SubmissionsService) {}

	@Post("start/:examId")
	@Roles(UserRole.STUDENT)
	@UseGuards(RolesGuard)
	async startExam(
		@Param("examId") examId: string,
		@Body("token") token?: string,
		@Request() req?: any
	) {
		const studentId = await this.submissionsService.getStudentIdFromUserId(
			req.user.userId
		);
		return this.submissionsService.startExam(studentId, +examId, token);
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

	@Post(":id/grade")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseGuards(RolesGuard)
	async gradeSubmission(@Param("id") id: string, @Body() body: any) {
		return this.submissionsService.gradeSubmission(+id, body);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseGuards(RolesGuard)
	async deleteSubmission(@Param("id") id: string) {
		return this.submissionsService.delete(+id);
	}

	@Patch(":submissionId/answer/:answerId")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseGuards(RolesGuard)
	async toggleAnswerCorrect(
		@Param("submissionId") submissionId: string,
		@Param("answerId") answerId: string,
		@Body() body: { isCorrect: boolean }
	) {
		return this.submissionsService.toggleAnswerCorrect(
			+submissionId,
			+answerId,
			body.isCorrect
		);
	}

	@Get("export")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseGuards(RolesGuard)
	@Header("Content-Type", "text/csv")
	async exportSubmissions(
		@Query("semesterId") semesterId?: string,
		@Query("classId") classId?: string,
		@Query("examId") examId?: string,
		@Query("studentId") studentId?: string
	) {
		return this.submissionsService.exportCsv({
			semesterId: semesterId ? Number(semesterId) : undefined,
			classId: classId ? Number(classId) : undefined,
			examId: examId ? Number(examId) : undefined,
			studentId: studentId ? Number(studentId) : undefined,
		});
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.submissionsService.findOne(+id);
	}
}
