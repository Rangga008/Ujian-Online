import {
	IsNotEmpty,
	IsNumber,
	IsString,
	IsEnum,
	IsOptional,
	IsDateString,
	IsBoolean,
} from "class-validator";
import { Gender } from "../student.entity";

export class CreateStudentDto {
	@IsNotEmpty()
	@IsNumber()
	userId: number;

	@IsNotEmpty()
	@IsNumber()
	semesterId: number;

	@IsNotEmpty()
	@IsString()
	name: string;

	@IsOptional()
	@IsNumber()
	classId?: number;

	@IsOptional()
	@IsEnum(Gender)
	gender?: Gender;

	@IsOptional()
	@IsDateString()
	dateOfBirth?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsString()
	address?: string;

	@IsOptional()
	@IsString()
	parentName?: string;

	@IsOptional()
	@IsString()
	parentPhone?: string;

	@IsOptional()
	@IsString()
	photoUrl?: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
