import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { StudentsModule } from "../students/students.module";
import { Student } from "../students/student.entity";
import { Semester } from "../semesters/semester.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([User, Student, Semester]),
		forwardRef(() => StudentsModule),
	],
	providers: [UsersService],
	controllers: [UsersController],
	exports: [UsersService],
})
export class UsersModule {}
