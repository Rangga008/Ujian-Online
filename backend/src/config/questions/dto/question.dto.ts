import {
	IsString,
	IsNumber,
	IsEnum,
	IsArray,
	IsOptional,
} from "class-validator";
import { QuestionType } from "../question.entity";

export class CreateQuestionDto {
	@IsNumber({}, { message: "examId must be a number" })
	examId: number;

	@IsString()
	questionText: string;

	@IsEnum(QuestionType)
	type: QuestionType;

	@IsOptional()
	@IsArray()
	options?: string[];

	@IsOptional()
	@IsArray()
	optionImages?: string[];

	@IsOptional()
	@IsString()
	correctAnswer?: string;

	@IsOptional()
	@IsNumber({}, { message: "points must be a number" })
	points?: number;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsNumber({}, { message: "orderIndex must be a number" })
	orderIndex?: number;
}

export class UpdateQuestionDto {
	@IsOptional()
	@IsString()
	questionText?: string;

	@IsOptional()
	@IsEnum(QuestionType)
	type?: QuestionType;

	@IsOptional()
	@IsArray()
	options?: string[];

	@IsOptional()
	@IsArray()
	optionImages?: string[];

	@IsOptional()
	@IsString()
	correctAnswer?: string;

	@IsOptional()
	@IsNumber({}, { message: "points must be a number" })
	points?: number;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsNumber({}, { message: "orderIndex must be a number" })
	orderIndex?: number;
}
