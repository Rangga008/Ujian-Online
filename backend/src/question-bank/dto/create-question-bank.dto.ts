import {
	IsString,
	IsEnum,
	IsNumber,
	IsBoolean,
	IsOptional,
	IsArray,
} from "class-validator";
import { QuestionType, DifficultyLevel } from "../question-bank.entity";

export class CreateQuestionBankDto {
	@IsNumber({}, { message: "subjectId must be a number" })
	subjectId: number;

	@IsString()
	questionText: string;

	@IsEnum(QuestionType)
	type: QuestionType;

	@IsArray()
	@IsString({ each: true })
	options: string[];

	@IsArray()
	@IsString({ each: true })
	correctAnswers: string[];

	@IsString()
	@IsOptional()
	explanation?: string;

	@IsEnum(DifficultyLevel)
	difficulty: DifficultyLevel;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[];

	@IsNumber({}, { message: "points must be a number" })
	@IsOptional()
	points?: number;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
