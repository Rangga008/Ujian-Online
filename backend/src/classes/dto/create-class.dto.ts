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

	@IsNumber()
	grade: number;

	@IsString()
	@IsOptional()
	major?: string;

	@IsNumber()
	academicYear: number;

	@IsNumber()
	@IsOptional()
	semesterId?: number;

	@IsNumber()
	@IsOptional()
	capacity?: number;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	teacherIds?: number[];
}
