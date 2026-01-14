import {
	IsString,
	IsNumber,
	IsDate,
	IsEnum,
	IsOptional,
	IsBoolean,
	IsArray,
	ValidateNested,
	Min,
	IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { ExamStatus, ExamTargetType } from "../exam.entity";
import { QuestionType } from "../../questions/question.entity";

export class CreateQuestionDto {
	@IsString()
	@IsNotEmpty({ message: "Question text is required" })
	questionText: string;

	@IsEnum(QuestionType, { message: "Invalid question type" })
	type: QuestionType;

	@IsOptional()
	@IsArray()
	options?: string[];

	@IsOptional()
	@IsString()
	correctAnswer?: string;

	@IsNumber()
	@Min(1, { message: "Points must be at least 1" })
	points: number;

	@IsOptional()
	@IsNumber()
	orderIndex?: number;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	optionImages?: string[];
}

export class CreateExamDto {
	@IsString()
	@IsNotEmpty({ message: "Judul ujian harus diisi" })
	title: string;

	@IsString()
	@IsNotEmpty({ message: "Deskripsi ujian harus diisi" })
	description: string;

	@IsNumber()
	@Min(1, { message: "Durasi minimal 1 menit" })
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
	@IsBoolean()
	requireToken?: boolean;

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
	@IsNumber({}, { message: "semesterId must be a number" })
	semesterId?: number;

	@IsOptional()
	@IsNumber({}, { message: "subjectId must be a number" })
	subjectId?: number;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateQuestionDto)
	questions?: CreateQuestionDto[];
}

export class UpdateExamDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty({ message: "Judul ujian harus diisi" })
	title?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsNumber()
	@Min(1, { message: "Durasi minimal 1 menit" })
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
	@IsNumber()
	totalQuestions?: number;

	@IsOptional()
	@IsBoolean()
	randomizeQuestions?: boolean;

	@IsOptional()
	@IsBoolean()
	showResultImmediately?: boolean;

	@IsOptional()
	@IsBoolean()
	requireToken?: boolean;

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
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateQuestionDto)
	questions?: CreateQuestionDto[];
}
