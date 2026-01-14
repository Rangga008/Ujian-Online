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
	UploadedFile,
	UseInterceptors,
	Res,
	BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import * as XLSX from "xlsx";
import { StudentsService } from "./students.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { ImportStudentsDto } from "./dto/import-students.dto";
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

	@Get("download-template")
	async downloadTemplate(@Res({ passthrough: false }) res: Response) {
		try {
			// Create workbook and worksheet
			const wb = XLSX.utils.book_new();
			const wsData = [
				["Nama", "Email", "NIS/NISN", "Password"],
				["John Doe", "john@example.com", "2024001", "password123"],
				["Jane Smith", "", "2024002", "password456"],
			];
			const ws = XLSX.utils.aoa_to_sheet(wsData);

			// Set column widths
			ws["!cols"] = [
				{ wch: 20 }, // Nama
				{ wch: 25 }, // Email (optional)
				{ wch: 15 }, // NIS
				{ wch: 15 }, // Password
			];

			XLSX.utils.book_append_sheet(wb, ws, "Siswa");

			// Generate buffer
			const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

			// Set headers and send file
			res.setHeader(
				"Content-Disposition",
				"attachment; filename=template-import-siswa.xlsx"
			);
			res.setHeader(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			);
			return res.send(buf);
		} catch (error) {
			console.error("Error generating template:", error);
			return res.status(500).json({
				statusCode: 500,
				message: "Gagal membuat template: " + error.message,
			});
		}
	}

	@Post("import")
	@UseInterceptors(FileInterceptor("file"))
	async importStudents(
		@UploadedFile() file: Express.Multer.File,
		@Body("semesterId") semesterId: string,
		@Body("classId") classId?: string
	) {
		if (!file) {
			throw new BadRequestException("File Excel diperlukan");
		}

		if (!semesterId) {
			throw new BadRequestException("Semester ID diperlukan");
		}

		try {
			// Parse Excel file
			const workbook = XLSX.read(file.buffer, { type: "buffer" });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json(worksheet) as any[];

			if (data.length === 0) {
				throw new BadRequestException("File Excel kosong");
			}

			// Validate headers - Email is now optional
			const firstRow = data[0];
			const requiredHeaders = ["Nama", "NIS", "Password"];
			const hasAllHeaders = requiredHeaders.every((h) => h in firstRow);

			if (!hasAllHeaders) {
				throw new BadRequestException(
					"Format file tidak sesuai. Pastikan kolom: Nama, NIS, Password (Email opsional)"
				);
			}

			// Import students
			const result = await this.studentsService.importStudents(
				data,
				+semesterId,
				classId ? +classId : undefined
			);

			return result;
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(
				"Gagal memproses file Excel: " + error.message
			);
		}
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
	async assignClass(
		@Param("id") id: string,
		@Body("classId") classId: number | null
	) {
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
