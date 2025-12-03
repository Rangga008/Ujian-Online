import {
	IsEmail,
	IsString,
	MinLength,
	IsOptional,
	IsEnum,
	IsBoolean,
} from "class-validator";
import { UserRole } from "../user.entity";

export class CreateUserDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(6)
	password: string;

	@IsString()
	name: string;

	@IsEnum(UserRole)
	role: UserRole;

	@IsOptional()
	@IsString()
	nis?: string; // For students

	@IsOptional()
	@IsString()
	nip?: string; // For teachers
}

export class UpdateUserDto {
	@IsOptional()
	@IsEmail()
	email?: string;

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
	nis?: string;

	@IsOptional()
	@IsString()
	nip?: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
