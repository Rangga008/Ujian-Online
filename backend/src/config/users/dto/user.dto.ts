import {
	IsEmail,
	IsString,
	MinLength,
	IsOptional,
	IsEnum,
	IsBoolean,
	ValidateIf,
} from "class-validator";
import { UserRole } from "../user.entity";

export class CreateUserDto {
	@ValidateIf(
		(o) => o.email !== undefined && o.email !== null && o.email !== ""
	)
	@IsEmail()
	email?: string; // Optional untuk teacher dan student

	@IsString()
	@MinLength(6)
	password: string;

	@IsString()
	name: string;

	@IsEnum(UserRole)
	role: UserRole;

	@IsOptional()
	@IsString()
	nis?: string; // Username untuk student

	@IsOptional()
	@IsString()
	nip?: string; // Username untuk teacher

	@IsOptional()
	@IsString()
	studentName?: string; // Actual student name (for role: student)
}

export class UpdateUserDto {
	@ValidateIf(
		(o) => o.email !== undefined && o.email !== null && o.email !== ""
	)
	@IsEmail()
	email?: string; // Optional untuk teacher dan student

	@IsOptional()
	@IsString()
	@MinLength(6)
	password?: string;

	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@IsOptional()
	@IsString()
	nis?: string; // Username untuk student

	@IsOptional()
	@IsString()
	nip?: string; // Username untuk teacher

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
