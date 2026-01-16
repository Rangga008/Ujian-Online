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
	Request,
} from "@nestjs/common";
import { QuestionBankService } from "./question-bank.service";
import { CreateQuestionBankDto } from "./dto/create-question-bank.dto";
import { UpdateQuestionBankDto } from "./dto/update-question-bank.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { DifficultyLevel, QuestionType } from "./question-bank.entity";

@Controller("question-bank")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionBankController {
	constructor(private readonly questionBankService: QuestionBankService) {}

	@Post()
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	create(@Body() createQuestionBankDto: CreateQuestionBankDto, @Request() req) {
		return this.questionBankService.create(createQuestionBankDto, req.user.id);
	}

	@Get()
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findAll(
		@Query("subjectId") subjectId?: string,
		@Query("difficulty") difficulty?: DifficultyLevel,
		@Query("type") type?: QuestionType,
		@Query("tags") tags?: string,
		@Query("isActive") isActive?: string
	) {
		const filters: any = {};

		if (subjectId) filters.subjectId = +subjectId;
		if (difficulty) filters.difficulty = difficulty;
		if (type) filters.type = type;
		if (tags) filters.tags = tags.split(",");
		if (isActive !== undefined) filters.isActive = isActive === "true";

		return this.questionBankService.findAll(filters);
	}

	@Get("subject/:subjectId")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findBySubject(@Param("subjectId") subjectId: string) {
		return this.questionBankService.findBySubject(+subjectId);
	}

	@Get("subject/:subjectId/stats")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	getStatsBySubject(@Param("subjectId") subjectId: string) {
		return this.questionBankService.getStatsBySubject(+subjectId);
	}

	@Get(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findOne(@Param("id") id: string) {
		return this.questionBankService.findOne(+id);
	}

	@Patch(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	update(
		@Param("id") id: string,
		@Body() updateQuestionBankDto: UpdateQuestionBankDto
	) {
		return this.questionBankService.update(+id, updateQuestionBankDto);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	remove(@Param("id") id: string) {
		return this.questionBankService.remove(+id);
	}
}
