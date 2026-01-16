import { IsNumber, IsNotEmpty, IsOptional } from "class-validator";

export class CreateSubmissionDto {
	@IsNumber({}, { message: "userId must be a number" })
	userId: number;

	@IsNumber({}, { message: "examId must be a number" })
	examId: number;
}

export class SubmitAnswerDto {
	@IsNumber({}, { message: "questionId must be a number" })
	questionId: number;

	@IsOptional()
	// Accept any value for answer (string, number, array, object) and let service handle conversion
	answer?: any;

	@IsOptional()
	// Base64 encoded photo or photo URL for photo-based answers
	photoAnswer?: string;
}
