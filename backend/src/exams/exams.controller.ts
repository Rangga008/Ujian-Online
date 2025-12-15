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
	UseInterceptors,
	UploadedFile,
	Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ExamsService } from "./exams.service";
import { CreateExamDto, UpdateExamDto } from "./dto/exam.dto";
import { QuestionsService } from "../questions/questions.service";
import {
	CreateQuestionDto,
	UpdateQuestionDto,
} from "../questions/dto/question.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { ExamStatus } from "./exam.entity";

@Controller("exams")
@UseGuards(JwtAuthGuard)
export class ExamsController {
	constructor(
		private readonly examsService: ExamsService,
		private readonly questionsService: QuestionsService
	) {}

	@Post()
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	create(@Body() createExamDto: CreateExamDto, @Request() req) {
		return this.examsService.create(createExamDto, req.user?.id);
	}

	@Get()
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findAll(@Query("status") status?: ExamStatus) {
		return this.examsService.findAll(status);
	}

	@Get("active")
	@Roles(UserRole.STUDENT)
	findActiveExams(@Request() req) {
		console.log(
			`👤 Student request - classId: ${req.user?.classId}, user: ${JSON.stringify(req.user)}`
		);
		return this.examsService.findActiveExamsByStudent(req.user?.classId);
	}

	@Get("debug/all")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	getAllExamsForDebug() {
		return this.examsService.findAllExams();
	}

	@Get("schedule")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	getSchedule(
		@Query("startDate") startDate?: string,
		@Query("endDate") endDate?: string,
		@Query("semesterId") semesterId?: string
	) {
		const semesterIdNum = semesterId ? Number(semesterId) : undefined;
		return this.examsService.getSchedule(startDate, endDate, semesterIdNum);
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
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	update(
		@Param("id") id: string,
		@Body() updateExamDto: UpdateExamDto,
		@Request() req
	) {
		return this.examsService.update(+id, updateExamDto, req.user?.id);
	}

	// Support PATCH for partial/full updates (frontend uses PATCH)
	@Patch(":id")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	updatePatch(
		@Param("id") id: string,
		@Body() updateExamDto: UpdateExamDto,
		@Request() req
	) {
		return this.examsService.update(+id, updateExamDto, req.user?.id);
	}

	@Patch(":id/status")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	updateStatus(@Param("id") id: string, @Body("status") status: ExamStatus) {
		return this.examsService.updateStatus(+id, status);
	}

	@Delete(":id")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	remove(@Param("id") id: string, @Request() req) {
		return this.examsService.remove(+id, req.user?.id);
	}

	// Question routes nested under exams
	@Post(":examId/questions")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseInterceptors(
		FileInterceptor("image", {
			storage: diskStorage({
				destination: "./public/uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix = Date.now();
					const ext = extname(file.originalname);
					cb(null, `file-${uniqueSuffix}${ext}`);
				},
			}),
			limits: { fileSize: 5 * 1024 * 1024 },
		})
	)
	createQuestion(
		@Param("examId") examId: string,
		@Body() createQuestionDto: any,
		@UploadedFile() file?: Express.Multer.File
	) {
		const dto: CreateQuestionDto = {
			...createQuestionDto,
			examId: +examId,
			points: +createQuestionDto.points,
			options: createQuestionDto.options
				? JSON.parse(createQuestionDto.options)
				: [],
			imageUrl: file ? `/uploads/${file.filename}` : undefined,
		};
		return this.questionsService.create(dto);
	}

	@Put(":examId/questions/:questionId")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseInterceptors(
		FileInterceptor("image", {
			storage: diskStorage({
				destination: "./public/uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix = Date.now();
					const ext = extname(file.originalname);
					cb(null, `file-${uniqueSuffix}${ext}`);
				},
			}),
			limits: { fileSize: 5 * 1024 * 1024 },
		})
	)
	updateQuestion(
		@Param("questionId") questionId: string,
		@Body() updateQuestionDto: any,
		@UploadedFile() file?: Express.Multer.File
	) {
		const dto: UpdateQuestionDto = {
			...updateQuestionDto,
			points: updateQuestionDto.points ? +updateQuestionDto.points : undefined,
			options:
				updateQuestionDto.options &&
				typeof updateQuestionDto.options === "string"
					? JSON.parse(updateQuestionDto.options)
					: updateQuestionDto.options,
			imageUrl: file
				? `/uploads/${file.filename}`
				: updateQuestionDto.imageUrl || undefined,
		};
		return this.questionsService.update(+questionId, dto);
	}

	@Delete(":examId/questions/:questionId")
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	removeQuestion(@Param("questionId") questionId: string) {
		return this.questionsService.remove(+questionId);
	}
}
