import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Semester } from "./semester.entity";
import { Exam } from "../exams/exam.entity";
import { Submission } from "../submissions/submission.entity";
import { Class } from "../classes/class.entity";
import { SemestersController } from "./semesters.controller";
import { SemestersService } from "./semesters.service";
import { StudentsModule } from "../students/students.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Semester, Exam, Submission, Class]),
		forwardRef(() => StudentsModule),
	],
	controllers: [SemestersController],
	providers: [SemestersService],
	exports: [SemestersService],
})
export class SemestersModule {}
