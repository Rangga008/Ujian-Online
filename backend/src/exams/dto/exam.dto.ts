import {
	IsString,
	IsNumber,
	IsDate,
	IsEnum,
	IsOptional,
	IsBoolean,
	IsArray,
	ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ExamStatus, ExamTargetType } from "../exam.entity";
import { QuestionType } from "../../questions/question.entity";

export class CreateQuestionDto {
	@IsString()
	questionText: string;

	@IsEnum(QuestionType)
	type: QuestionType;

	@IsOptional()
	@IsArray()
	options?: string[];

	@IsString()
	correctAnswer: string;

	@IsNumber()
	points: number;

	@IsOptional()
	@IsNumber()
	orderIndex?: number;
}

export class CreateExamDto {
	@IsString()
	title: string;

	@IsString()
	description: string;

	@IsNumber()
	duration: number;

	@Type(() => Date)
	@IsDate()
	startTime: Date;

	@Type(() => Date)
	@IsDate()
	endTime: Date;

	@IsOptional()
	@IsEnum(ExamStatus)
	status?: ExamStatus;

	@IsOptional()
	@IsNumber()
	totalScore?: number;

	@IsOptional()
	@IsBoolean()
	randomizeQuestions?: boolean;

	@IsOptional()
	@IsBoolean()
	showResultImmediately?: boolean;

	@IsOptional()
	@IsNumber()
	classId?: number;

	@IsOptional()
	@IsEnum(ExamTargetType)
	targetType?: ExamTargetType;

	@IsOptional()
	@IsString()
	grade?: string;

	@IsOptional()
	@IsNumber()
	semesterId?: number;

	@IsOptional()
	@IsNumber()
	subjectId?: number;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateQuestionDto)
	questions?: CreateQuestionDto[];
}

export class UpdateExamDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsNumber()
	duration?: number;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	startTime?: Date;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	endTime?: Date;

	@IsOptional()
	@IsEnum(ExamStatus)
	status?: ExamStatus;

	@IsOptional()
	@IsNumber()
	totalScore?: number;

	@IsOptional()
	@IsBoolean()
	randomizeQuestions?: boolean;

	@IsOptional()
	@IsBoolean()
	showResultImmediately?: boolean;

	@IsOptional()
	@IsNumber()
	classId?: number;

	@IsOptional()
	@IsEnum(ExamTargetType)
	targetType?: ExamTargetType;

	@IsOptional()
	@IsString()
	grade?: string;

	@IsOptional()
	@IsNumber()
	semesterId?: number;

	@IsOptional()
	@IsNumber()
	subjectId?: number;
}
