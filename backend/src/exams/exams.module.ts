import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam } from "./exam.entity";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { Question } from "../questions/question.entity";
import { QuestionsService } from "../questions/questions.service";
import { ActivityModule } from "../activity/activity.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Exam, Semester, Class, Question]),
		ActivityModule,
	],
	providers: [ExamsService, QuestionsService],
	controllers: [ExamsController],
	exports: [ExamsService],
})
export class ExamsModule {}
