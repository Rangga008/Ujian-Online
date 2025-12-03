import {
	IsString,
	IsBoolean,
	IsOptional,
	IsArray,
	IsNumber,
} from "class-validator";

export class CreateSubjectDto {
	@IsString()
	name: string;

	@IsString()
	code: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsString()
	@IsOptional()
	color?: string;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	teacherIds?: number[];
}
