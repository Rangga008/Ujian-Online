import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { Student } from "./student.entity";
import { User } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { SemestersModule } from "../semesters/semester.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Student, User, Semester, Class]),
		forwardRef(() => SemestersModule),
		MulterModule.register({
			limits: {
				fileSize: 5 * 1024 * 1024, // 5MB
			},
		}),
	],
	controllers: [StudentsController],
	providers: [StudentsService],
	exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}
