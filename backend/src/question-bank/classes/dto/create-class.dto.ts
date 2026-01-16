import {
	IsString,
	IsNumber,
	IsBoolean,
	IsOptional,
	IsArray,
} from "class-validator";

export class CreateClassDto {
	@IsString()
	name: string;

	@IsNumber({}, { message: "grade must be a number" })
	grade: number;

	@IsNumber({}, { message: "gradeId must be a number" })
	@IsOptional()
	gradeId?: number;

	@IsString()
	@IsOptional()
	major?: string;

	@IsNumber({}, { message: "academicYear must be a number" })
	academicYear: number;

	@IsNumber({}, { message: "semesterId must be a number" })
	@IsOptional()
	semesterId?: number;

	@IsNumber({}, { message: "capacity must be a number" })
	@IsOptional()
	capacity?: number;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsArray()
	@IsNumber(
		{},
		{ each: true, message: "teacherIds must be an array of numbers" }
	)
	@IsOptional()
	teacherIds?: number[];

	@IsArray()
	@IsNumber(
		{},
		{ each: true, message: "subjectIds must be an array of numbers" }
	)
	@IsOptional()
	subjectIds?: number[];
}
