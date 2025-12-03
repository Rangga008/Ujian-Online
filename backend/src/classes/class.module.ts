import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Class } from "./class.entity";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";
import { User } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";
import { Student } from "../students/student.entity";

@Module({
	imports: [TypeOrmModule.forFeature([Class, User, Student, Semester])],
	controllers: [ClassesController],
	providers: [ClassesService],
	exports: [ClassesService],
})
export class ClassesModule {}
