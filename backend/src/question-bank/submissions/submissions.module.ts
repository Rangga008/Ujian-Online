import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Submission } from "./submission.entity";
import { Answer } from "./answer.entity";
import { SubmissionsService } from "./submissions.service";
import { SubmissionsController } from "./submissions.controller";
import { QuestionsModule } from "../questions/questions.module";
import { ExamsModule } from "../exams/exams.module";
import { Student } from "../students/student.entity";
import { Semester } from "../semesters/semester.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([Submission, Answer, Student, Semester]),
		QuestionsModule,
		ExamsModule,
	],
	providers: [SubmissionsService],
	controllers: [SubmissionsController],
	exports: [SubmissionsService],
})
export class SubmissionsModule {}
