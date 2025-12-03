import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { Student } from "./student.entity";
import { User } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";
import { SemestersModule } from "../semesters/semester.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Student, User, Semester]),
		forwardRef(() => SemestersModule),
	],
	controllers: [StudentsController],
	providers: [StudentsService],
	exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}
