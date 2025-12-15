import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { QuestionBank } from "../question-bank/question-bank.entity";
import { Submission } from "../submissions/submission.entity";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { StudentsModule } from "../students/students.module";
import { Student } from "../students/student.entity";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { TeacherAssignment } from "../teacher-assignments/teacher-assignment.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			User,
			Student,
			Semester,
			Class,
			TeacherAssignment,
			QuestionBank,
			Submission,
		]),
		forwardRef(() => StudentsModule),
	],
	providers: [UsersService],
	controllers: [UsersController],
	exports: [UsersService],
})
export class UsersModule {}
