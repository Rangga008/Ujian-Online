import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Query,
	UseGuards,
} from "@nestjs/common";
import { StudentsService } from "./students.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Student } from "./student.entity";
import { User } from "../users/user.entity";
import { Class } from "../classes/class.entity";

@Controller("students")
@UseGuards(JwtAuthGuard)
export class StudentsController {
	constructor(private readonly studentsService: StudentsService) {}

	@Post()
	create(@Body() createStudentDto: CreateStudentDto) {
		return this.studentsService.create(createStudentDto);
	}

	@Get()
	findAll(
		@Query("semesterId") semesterId?: string,
		@Query("classId") classId?: string
	) {
		return this.studentsService.findAll(
			semesterId ? +semesterId : undefined,
			classId ? +classId : undefined
		);
	}

	@Get("user/:userId")
	findByUser(
		@Param("userId") userId: string,
		@Query("semesterId") semesterId?: string
	) {
		return this.studentsService.findByUser(
			+userId,
			semesterId ? +semesterId : undefined
		);
	}

	@Get("user/:userId/active-semester")
	findByUserAndActiveSemester(@Param("userId") userId: string) {
		return this.studentsService.findByUserAndActiveSemester(+userId);
	}

	// Get all student records (across all semesters) for a specific user
	@Get("user/:userId/history")
	async getUserStudentHistory(@Param("userId") userId: string) {
		const students = await this.studentsService.findByUser(+userId);
		return students.map((s) => ({
			id: s.id,
			semesterId: s.semester.id,
			semesterName: s.semester.name,
			semesterYear: (s.semester as any).year,
			isActive: s.isActive,
			classId: s.class?.id,
			className: s.class?.name,
			classGrade: (s.class as any)?.grade,
			classMajor: (s.class as any)?.major,
		}));
	}

	// Helper endpoint: list users with their student record in the active semester
	@Get("active-semester-list")
	async listUsersWithActiveSemesterStudent(): Promise<
		Array<{ user: Partial<User>; student: Student; class: Partial<Class> }>
	> {
		// Get all students in active semester
		const activeStudents = await this.studentsService.findAll(
			(
				await this.studentsService["semestersRepository"].findOne({
					where: { isActive: true },
				})
			)?.id
		);

		// Map to response shape
		return activeStudents.map((s) => ({
			user: {
				id: s.user.id,
				email: s.user.email,
				nis: (s.user as any).nis,
				name: (s.user as any).name,
				role: (s.user as any).role,
				isActive: s.user.isActive,
			},
			student: s,
			class: {
				id: s.class?.id,
				name: s.class?.name,
				grade: (s.class as any)?.grade,
				major: (s.class as any)?.major,
			},
		}));
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.studentsService.findOne(+id);
	}

	// Assign class to student in active semester
	@Patch(":id/assign-class")
	async assignClass(@Param("id") id: string, @Body("classId") classId: number) {
		return this.studentsService.update(+id, { classId });
	}

	@Patch(":id")
	update(@Param("id") id: string, @Body() updateStudentDto: UpdateStudentDto) {
		return this.studentsService.update(+id, updateStudentDto);
	}

	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.studentsService.remove(+id);
	}
}
