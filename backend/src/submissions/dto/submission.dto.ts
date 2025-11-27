import { IsNumber, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  examId: number;
}

export class SubmitAnswerDto {
  @IsNumber()
  questionId: number;

  @IsString()
  answer: string;
}
