import {
	IsString,
	IsNumber,
	IsEnum,
	IsDateString,
	IsBoolean,
	IsOptional,
} from "class-validator";
import { SemesterType } from "../semester.entity";

export class CreateSemesterDto {
	@IsString()
	name: string;

	@IsString()
	year: string;

	@IsEnum(SemesterType)
	type: SemesterType;

	@IsDateString()
	@IsOptional()
	startDate?: string;

	@IsDateString()
	@IsOptional()
	endDate?: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
