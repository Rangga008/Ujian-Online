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
	@IsNumber({}, { message: "userId must be a number" })
	userId: number;

	@IsNotEmpty()
	@IsNumber({}, { message: "semesterId must be a number" })
	semesterId: number;

	@IsNotEmpty()
	@IsString()
	name: string;

	@IsOptional()
	@IsNumber({}, { message: "classId must be a number" })
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
