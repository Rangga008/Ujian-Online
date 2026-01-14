import { IsNumber, IsOptional, IsString } from "class-validator";

export class ImportStudentsDto {
	@IsNumber({}, { message: "semesterId must be a number" })
	semesterId: number;

	@IsOptional()
	@IsNumber({}, { message: "classId must be a number" })
	classId?: number;
}
