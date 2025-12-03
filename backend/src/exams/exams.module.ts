import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam } from "./exam.entity";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";

@Module({
	imports: [TypeOrmModule.forFeature([Exam, Semester, Class])],
	providers: [ExamsService],
	controllers: [ExamsController],
	exports: [ExamsService],
})
export class ExamsModule {}
