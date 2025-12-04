import { IsNumber, IsOptional, IsString } from "class-validator";

export class ImportStudentsDto {
	@IsNumber()
	semesterId: number;

	@IsOptional()
	@IsNumber()
	classId?: number;
}
