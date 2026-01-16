import { IsString, IsBoolean, IsOptional } from "class-validator";

export class CreateSettingDto {
	@IsString()
	key: string;

	@IsString()
	@IsOptional()
	value?: string;

	@IsString()
	@IsOptional()
	type?: string;

	@IsString()
	@IsOptional()
	group?: string;

	@IsString()
	@IsOptional()
	label?: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsBoolean()
	@IsOptional()
	isPublic?: boolean;
}
