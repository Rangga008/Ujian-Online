import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { User, UserRole } from "../../users/user.entity";
import { Student, Gender } from "../../students/student.entity";
import { Exam, ExamStatus } from "../../exams/exam.entity";
import { Question, QuestionType } from "../../questions/question.entity";
import { Submission } from "../../submissions/submission.entity";
import { Answer } from "../../submissions/answer.entity";
import { Semester, SemesterType } from "../../semesters/semester.entity";
import { Subject } from "../../subjects/subject.entity";
import { Class } from "../../classes/class.entity";
import {
	QuestionBank,
	DifficultyLevel,
} from "../../question-bank/question-bank.entity";
import { Setting } from "../../settings/setting.entity";

const AppDataSource = new DataSource({
	type: "mysql",
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT || "3306"),
	username: process.env.DB_USERNAME || "root",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_DATABASE || "ujian_online",
	entities: [
		User,
		Student,
		Exam,
		Question,
		Submission,
		Answer,
		Semester,
		Subject,
		Class,
		QuestionBank,
		Setting,
	],
	synchronize: true,
});

async function seed() {
	try {
		await AppDataSource.initialize();
		console.log("Data Source initialized");

		const userRepo = AppDataSource.getRepository(User);
		const studentRepo = AppDataSource.getRepository(Student);
		const examRepo = AppDataSource.getRepository(Exam);
		const questionRepo = AppDataSource.getRepository(Question);
		const semesterRepo = AppDataSource.getRepository(Semester);
		const subjectRepo = AppDataSource.getRepository(Subject);
		const classRepo = AppDataSource.getRepository(Class);
		const questionBankRepo = AppDataSource.getRepository(QuestionBank);
		const answerRepo = AppDataSource.getRepository(Answer);
		const submissionRepo = AppDataSource.getRepository(Submission);
		const settingRepo = AppDataSource.getRepository(Setting);

		// Clear existing data (order matters due to foreign keys)
		console.log("Clearing existing data...");
		await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 0");
		await AppDataSource.query("DELETE FROM `answers`");
		await AppDataSource.query("DELETE FROM `submissions`");
		await AppDataSource.query("DELETE FROM `question_bank`");
		await AppDataSource.query("DELETE FROM `questions`");
		await AppDataSource.query("DELETE FROM `exams`");
		await AppDataSource.query("DELETE FROM `students`");
		await AppDataSource.query("DELETE FROM `users`");
		await AppDataSource.query("DELETE FROM `classes`");
		await AppDataSource.query("DELETE FROM `subjects`");
		await AppDataSource.query("DELETE FROM `semesters`");
		await AppDataSource.query("DELETE FROM `settings`");
		await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 1");
		console.log("Existing data cleared");

		// Initialize Settings
		const defaultSettings = [
			{
				key: "app.name",
				value: "Sistem Ujian Online",
				type: "text",
				group: "general",
				label: "Nama Aplikasi",
				description: "Nama aplikasi yang ditampilkan di halaman",
				isPublic: true,
			},
			{
				key: "app.short_name",
				value: "SUO",
				type: "text",
				group: "general",
				label: "Nama Singkat",
				description: "Nama singkat aplikasi",
				isPublic: true,
			},
			{
				key: "app.description",
				value: "Platform ujian online untuk sekolah",
				type: "text",
				group: "general",
				label: "Deskripsi",
				description: "Deskripsi aplikasi",
				isPublic: true,
			},
			{
				key: "app.logo",
				value: "/images/logo.png",
				type: "image",
				group: "appearance",
				label: "Logo",
				description: "Logo aplikasi (URL atau path)",
				isPublic: true,
			},
			{
				key: "app.logo_dark",
				value: "/images/logo-dark.png",
				type: "image",
				group: "appearance",
				label: "Logo Dark Mode",
				description: "Logo untuk dark mode",
				isPublic: true,
			},
			{
				key: "app.favicon",
				value: "/favicon.ico",
				type: "image",
				group: "appearance",
				label: "Favicon",
				description: "Icon yang muncul di browser tab",
				isPublic: true,
			},
			{
				key: "app.primary_color",
				value: "#3B82F6",
				type: "color",
				group: "appearance",
				label: "Warna Utama",
				description: "Warna tema utama aplikasi",
				isPublic: true,
			},
			{
				key: "school.name",
				value: "SMA Negeri 1",
				type: "text",
				group: "school",
				label: "Nama Sekolah",
				description: "Nama sekolah/institusi",
				isPublic: true,
			},
			{
				key: "school.address",
				value: "Jl. Pendidikan No. 1, Jakarta",
				type: "text",
				group: "school",
				label: "Alamat Sekolah",
				description: "Alamat lengkap sekolah",
				isPublic: true,
			},
			{
				key: "school.phone",
				value: "021-12345678",
				type: "text",
				group: "school",
				label: "Telepon",
				description: "Nomor telepon sekolah",
				isPublic: true,
			},
			{
				key: "school.email",
				value: "info@sekolah.sch.id",
				type: "text",
				group: "school",
				label: "Email",
				description: "Email sekolah",
				isPublic: true,
			},
			{
				key: "exam.auto_submit",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Auto Submit",
				description: "Otomatis submit ujian saat waktu habis",
				isPublic: false,
			},
			{
				key: "exam.allow_review",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Review Jawaban",
				description: "Siswa bisa review jawaban sebelum submit",
				isPublic: false,
			},
			{
				key: "exam.show_score",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Tampilkan Nilai",
				description: "Tampilkan nilai langsung setelah ujian",
				isPublic: false,
			},
		];

		for (const settingData of defaultSettings) {
			const setting = settingRepo.create(settingData);
			await settingRepo.save(setting);
		}
		console.log("Settings initialized");

		// Create Semesters (multiple academic years)
		const semesters = [
			{
				name: "Semester Ganjil 2023/2024",
				year: "2023/2024",
				type: SemesterType.GANJIL,
				startDate: new Date("2023-07-01"),
				endDate: new Date("2023-12-31"),
				isActive: false,
			},
			{
				name: "Semester Genap 2023/2024",
				year: "2023/2024",
				type: SemesterType.GENAP,
				startDate: new Date("2024-01-02"),
				endDate: new Date("2024-06-30"),
				isActive: false,
			},
			{
				name: "Semester Ganjil 2024/2025",
				year: "2024/2025",
				type: SemesterType.GANJIL,
				startDate: new Date("2024-07-01"),
				endDate: new Date("2024-12-31"),
				isActive: false,
			},
			{
				name: "Semester Genap 2024/2025",
				year: "2024/2025",
				type: SemesterType.GENAP,
				startDate: new Date("2025-01-02"),
				endDate: new Date("2025-06-30"),
				isActive: true, // Currently active semester
			},
			{
				name: "Semester Ganjil 2025/2026",
				year: "2025/2026",
				type: SemesterType.GANJIL,
				startDate: new Date("2025-07-01"),
				endDate: new Date("2025-12-31"),
				isActive: false,
			},
		];

		const savedSemesters = [];
		for (const semesterData of semesters) {
			const semester = semesterRepo.create(semesterData);
			const saved = await semesterRepo.save(semester);
			savedSemesters.push(saved);
		}
		console.log("Semesters created (5 semesters across 3 academic years)");

		// Create Subjects
		const subjects = [
			{
				name: "Matematika",
				code: "MTK",
				description: "Mata pelajaran Matematika",
				color: "#3B82F6",
				isActive: true,
			},
			{
				name: "Bahasa Indonesia",
				code: "BIND",
				description: "Mata pelajaran Bahasa Indonesia",
				color: "#10B981",
				isActive: true,
			},
			{
				name: "Bahasa Inggris",
				code: "BING",
				description: "Mata pelajaran Bahasa Inggris",
				color: "#8B5CF6",
				isActive: true,
			},
		];

		const savedSubjects = [];
		for (const subjectData of subjects) {
			const subject = subjectRepo.create(subjectData);
			const saved = await subjectRepo.save(subject);
			savedSubjects.push(saved);
		}
		console.log("Subjects created");

		// Active semester for class creation
		const activeSemester = savedSemesters.find((s) => s.isActive);

		// Create Classes (more variety) - Assign to active semester
		const classes = [
			// Grade 10
			{
				name: "10 IPA 1",
				grade: 10,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "10 IPA 2",
				grade: 10,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "10 IPS 1",
				grade: 10,
				major: "IPS",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			// Grade 11
			{
				name: "11 IPA 1",
				grade: 11,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "11 IPA 2",
				grade: 11,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "11 IPS 1",
				grade: 11,
				major: "IPS",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			// Grade 12
			{
				name: "12 IPA 1",
				grade: 12,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "12 IPA 2",
				grade: 12,
				major: "IPA",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
			{
				name: "12 IPS 1",
				grade: 12,
				major: "IPS",
				academicYear: 2024,
				capacity: 36,
				semesterId: activeSemester.id,
				isActive: true,
			},
		];

		const savedClasses = [];
		for (const classData of classes) {
			const classEntity = classRepo.create(classData);
			const saved = await classRepo.save(classEntity);
			savedClasses.push(saved);
		}
		console.log(
			"Classes created (9 classes for active semester across 3 grades)"
		);

		// Create Admin
		const hashedAdminPassword = await bcrypt.hash("admin123", 10);
		const admin = userRepo.create({
			email: "admin@ujian.com",
			password: hashedAdminPassword,
			name: "Administrator",
			role: UserRole.ADMIN,
		});
		await userRepo.save(admin);
		console.log("Admin created");

		// Create Teachers (User accounts only)
		const hashedTeacherPassword = await bcrypt.hash("guru123", 10);
		const teachers = [
			{
				email: "guru.matematika@sekolah.com",
				nip: "198501012010011001",
				password: hashedTeacherPassword,
				name: "Dr. Siti Rahmawati",
				role: UserRole.TEACHER,
				isActive: true,
			},
			{
				email: "guru.bindonesia@sekolah.com",
				nip: "198701012012011002",
				password: hashedTeacherPassword,
				name: "Ahmad Subarjo, S.Pd",
				role: UserRole.TEACHER,
				isActive: true,
			},
			{
				email: "guru.inggris@sekolah.com",
				nip: "198803152013012001",
				password: hashedTeacherPassword,
				name: "Dewi Lestari, M.Pd",
				role: UserRole.TEACHER,
				isActive: true,
			},
		];

		const savedTeachers = [];
		for (const teacherData of teachers) {
			const teacher = userRepo.create(teacherData);
			const saved = await userRepo.save(teacher);
			savedTeachers.push(saved);
		}
		console.log("Teachers created");

		// Assign teachers to subjects
		savedSubjects[0].teachers = [savedTeachers[0]]; // Matematika
		savedSubjects[1].teachers = [savedTeachers[1]]; // Bahasa Indonesia
		savedSubjects[2].teachers = [savedTeachers[2]]; // Bahasa Inggris
		await subjectRepo.save(savedSubjects);

		// Assign teachers to classes
		savedClasses[0].teachers = [savedTeachers[0]]; // 10 IPA 1
		savedClasses[1].teachers = [savedTeachers[0]]; // 10 IPA 2
		savedClasses[3].teachers = [savedTeachers[0]]; // 11 IPA 1
		savedClasses[4].teachers = [savedTeachers[0]]; // 11 IPA 2
		savedClasses[6].teachers = [savedTeachers[0]]; // 12 IPA 1
		savedClasses[7].teachers = [savedTeachers[0]]; // 12 IPA 2
		savedClasses[2].teachers = [savedTeachers[1]]; // 10 IPS 1
		savedClasses[5].teachers = [savedTeachers[1]]; // 11 IPS 1
		savedClasses[8].teachers = [savedTeachers[1]]; // 12 IPS 1
		await classRepo.save(savedClasses);

		// Create Student Users (accounts only, no personal data) - More students
		const hashedStudentPassword = await bcrypt.hash("siswa123", 10);

		const studentUsers = [
			// 10 students for variety
			{
				email: "siswa1@test.com",
				nis: "2024001",
				password: hashedStudentPassword,
				name: "User Siswa 1",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa2@test.com",
				nis: "2024002",
				password: hashedStudentPassword,
				name: "User Siswa 2",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa3@test.com",
				nis: "2024003",
				password: hashedStudentPassword,
				name: "User Siswa 3",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa4@test.com",
				nis: "2024004",
				password: hashedStudentPassword,
				name: "User Siswa 4",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa5@test.com",
				nis: "2024005",
				password: hashedStudentPassword,
				name: "User Siswa 5",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa6@test.com",
				nis: "2024006",
				password: hashedStudentPassword,
				name: "User Siswa 6",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa7@test.com",
				nis: "2024007",
				password: hashedStudentPassword,
				name: "User Siswa 7",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa8@test.com",
				nis: "2024008",
				password: hashedStudentPassword,
				name: "User Siswa 8",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa9@test.com",
				nis: "2024009",
				password: hashedStudentPassword,
				name: "User Siswa 9",
				role: UserRole.STUDENT,
				isActive: true,
			},
			{
				email: "siswa10@test.com",
				nis: "2024010",
				password: hashedStudentPassword,
				name: "User Siswa 10",
				role: UserRole.STUDENT,
				isActive: true,
			},
		];

		const savedStudentUsers = [];
		for (const studentUserData of studentUsers) {
			const studentUser = userRepo.create(studentUserData);
			const saved = await userRepo.save(studentUser);
			savedStudentUsers.push(saved);
		}
		console.log("Student accounts created (10 students)");

		// Create Student Data (per semester) - for active semester
		const studentNames = [
			{
				name: "Budi Santoso",
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-05-15"),
				phone: "081234567891",
				address: "Jl. Merdeka No. 123, Jakarta",
				parentName: "Supriyanto",
				parentPhone: "081234567801",
			},
			{
				name: "Siti Nurhaliza",
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-08-22"),
				phone: "081234567892",
				address: "Jl. Sudirman No. 45, Jakarta",
				parentName: "Bambang Wicaksono",
				parentPhone: "081234567802",
			},
			{
				name: "Ahmad Fauzi",
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-11-10"),
				phone: "081234567893",
				address: "Jl. Thamrin No. 78, Jakarta",
				parentName: "Fauzan Hidayat",
				parentPhone: "081234567803",
			},
			{
				name: "Putri Maharani",
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-03-18"),
				phone: "081234567894",
				address: "Jl. Gatot Subroto No. 12, Jakarta",
				parentName: "Hendra Kusuma",
				parentPhone: "081234567804",
			},
			{
				name: "Rizky Pratama",
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-07-25"),
				phone: "081234567895",
				address: "Jl. HR Rasuna Said No. 34, Jakarta",
				parentName: "Surya Wijaya",
				parentPhone: "081234567805",
			},
			{
				name: "Dewi Anggraini",
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-09-14"),
				phone: "081234567896",
				address: "Jl. Kuningan No. 56, Jakarta",
				parentName: "Agus Setiawan",
				parentPhone: "081234567806",
			},
			{
				name: "Yoga Aditya",
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-12-03"),
				phone: "081234567897",
				address: "Jl. Menteng No. 78, Jakarta",
				parentName: "Budi Hartono",
				parentPhone: "081234567807",
			},
			{
				name: "Rina Wulandari",
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-04-20"),
				phone: "081234567898",
				address: "Jl. Kebon Sirih No. 90, Jakarta",
				parentName: "Eko Prasetyo",
				parentPhone: "081234567808",
			},
			{
				name: "Farhan Maulana",
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-06-11"),
				phone: "081234567899",
				address: "Jl. Cikini No. 23, Jakarta",
				parentName: "Doni Saputra",
				parentPhone: "081234567809",
			},
			{
				name: "Laila Sari",
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-10-08"),
				phone: "081234567800",
				address: "Jl. Bendungan Hilir No. 45, Jakarta",
				parentName: "Firman Hidayat",
				parentPhone: "081234567810",
			},
		];

		// Distribute students across different classes
		const classDistribution = [
			savedClasses[6].id, // 12 IPA 1
			savedClasses[6].id, // 12 IPA 1
			savedClasses[7].id, // 12 IPA 2
			savedClasses[7].id, // 12 IPA 2
			savedClasses[8].id, // 12 IPS 1
			savedClasses[8].id, // 12 IPS 1
			savedClasses[3].id, // 11 IPA 1
			savedClasses[4].id, // 11 IPA 2
			savedClasses[0].id, // 10 IPA 1
			savedClasses[1].id, // 10 IPA 2
		];

		for (let i = 0; i < savedStudentUsers.length; i++) {
			const student = studentRepo.create({
				userId: savedStudentUsers[i].id,
				semesterId: activeSemester.id,
				name: studentNames[i].name,
				classId: classDistribution[i],
				gender: studentNames[i].gender,
				dateOfBirth: studentNames[i].dateOfBirth,
				phone: studentNames[i].phone,
				address: studentNames[i].address,
				parentName: studentNames[i].parentName,
				parentPhone: studentNames[i].parentPhone,
				isActive: true,
			});
			await studentRepo.save(student);
		}
		console.log(
			"Student data created for active semester (10 students distributed across classes)"
		);

		// Create historical student records for previous semesters (demo multi-semester feature)
		const semesterGanjil2024 = savedSemesters.find(
			(s) => s.name === "Semester Ganjil 2024/2025"
		);
		const semesterGenap2023 = savedSemesters.find(
			(s) => s.name === "Semester Genap 2023/2024"
		);
		const semesterGanjil2023 = savedSemesters.find(
			(s) => s.name === "Semester Ganjil 2023/2024"
		);

		// Historical records for 3 students across multiple semesters
		// NOTE: classId is null because no classes exist for old semesters
		const historicalRecords = [
			// Budi Santoso - 3 previous semesters (no class assignment in old semesters)
			{
				userId: savedStudentUsers[0].id,
				semesterId: semesterGanjil2024.id,
				name: "Budi Santoso",
				classId: null, // No classes in old semester
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-05-15"),
				phone: "081234567891",
				address: "Jl. Merdeka No. 123, Jakarta",
				parentName: "Supriyanto",
				parentPhone: "081234567801",
				isActive: false,
			},
			{
				userId: savedStudentUsers[0].id,
				semesterId: semesterGenap2023.id,
				name: "Budi Santoso",
				classId: null, // No classes in old semester
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-05-15"),
				phone: "081234567891",
				address: "Jl. Merdeka No. 123, Jakarta",
				parentName: "Supriyanto",
				parentPhone: "081234567801",
				isActive: false,
			},
			{
				userId: savedStudentUsers[0].id,
				semesterId: semesterGanjil2023.id,
				name: "Budi Santoso",
				classId: null, // No classes in old semester
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-05-15"),
				phone: "081234567891",
				address: "Jl. Merdeka No. 123, Jakarta",
				parentName: "Supriyanto",
				parentPhone: "081234567801",
				isActive: false,
			},
			// Siti Nurhaliza - 2 previous semesters (no class assignment in old semesters)
			{
				userId: savedStudentUsers[1].id,
				semesterId: semesterGanjil2024.id,
				name: "Siti Nurhaliza",
				classId: null, // No classes in old semester
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-08-22"),
				phone: "081234567892",
				address: "Jl. Sudirman No. 45, Jakarta",
				parentName: "Bambang Wicaksono",
				parentPhone: "081234567802",
				isActive: false,
			},
			{
				userId: savedStudentUsers[1].id,
				semesterId: semesterGenap2023.id,
				name: "Siti Nurhaliza",
				classId: null, // No classes in old semester
				gender: Gender.FEMALE,
				dateOfBirth: new Date("2007-08-22"),
				phone: "081234567892",
				address: "Jl. Sudirman No. 45, Jakarta",
				parentName: "Bambang Wicaksono",
				parentPhone: "081234567802",
				isActive: false,
			},
			// Ahmad Fauzi - 1 previous semester (no class assignment in old semester)
			{
				userId: savedStudentUsers[2].id,
				semesterId: semesterGanjil2024.id,
				name: "Ahmad Fauzi",
				classId: null, // No classes in old semester
				gender: Gender.MALE,
				dateOfBirth: new Date("2007-11-10"),
				phone: "081234567893",
				address: "Jl. Thamrin No. 78, Jakarta",
				parentName: "Fauzan Hidayat",
				parentPhone: "081234567803",
				isActive: false,
			},
		];

		for (const record of historicalRecords) {
			const historicalStudent = studentRepo.create(record);
			await studentRepo.save(historicalStudent);
		}

		console.log(
			"Historical student records created (7 records across 3 students demonstrating multi-semester)"
		);

		// Create Question Bank
		const questionBanks = [
			{
				subjectId: savedSubjects[0].id,
				questionText: "Berapakah hasil dari 2 + 2?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["3", "4", "5", "6"],
				correctAnswers: ["4"],
				explanation: "2 + 2 = 4",
				difficulty: DifficultyLevel.EASY,
				tags: ["aritmatika", "dasar"],
				points: 10,
				isActive: true,
				createdById: savedTeachers[0].id,
			},
			{
				subjectId: savedSubjects[0].id,
				questionText: "Berapakah hasil dari 12 × 5?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["50", "55", "60", "65"],
				correctAnswers: ["60"],
				explanation: "12 × 5 = 60",
				difficulty: DifficultyLevel.MEDIUM,
				tags: ["perkalian"],
				points: 15,
				isActive: true,
				createdById: savedTeachers[0].id,
			},
		];

		for (const qbData of questionBanks) {
			const qb = questionBankRepo.create(qbData);
			await questionBankRepo.save(qb);
		}
		console.log("Question Bank created");

		// Create Multiple Exams for different subjects and classes
		const startTime = new Date();
		startTime.setHours(startTime.getHours() - 1); // Started 1 hour ago

		const endTime = new Date();
		endTime.setDate(endTime.getDate() + 7); // Ends in 7 days

		const examsData = [
			// Matematika Exams
			{
				title: "Ujian Matematika - Kelas 12 IPA 1",
				description:
					"Ujian tengah semester untuk mata pelajaran Matematika kelas 12 IPA 1",
				duration: 90,
				startTime,
				endTime,
				status: ExamStatus.PUBLISHED,
				totalQuestions: 10,
				totalScore: 100,
				randomizeQuestions: true,
				showResultImmediately: false,
				semesterId: activeSemester.id,
				subjectId: savedSubjects[0].id, // Matematika
			},
			{
				title: "Ujian Matematika - Kelas 11 IPA 1",
				description:
					"Ujian tengah semester untuk mata pelajaran Matematika kelas 11 IPA 1",
				duration: 90,
				startTime,
				endTime,
				status: ExamStatus.PUBLISHED,
				totalQuestions: 8,
				totalScore: 100,
				randomizeQuestions: true,
				showResultImmediately: false,
				semesterId: activeSemester.id,
				subjectId: savedSubjects[0].id, // Matematika
			},
			// Bahasa Indonesia Exam
			{
				title: "Ujian Bahasa Indonesia - Kelas 12 IPS 1",
				description:
					"Ujian tengah semester untuk mata pelajaran Bahasa Indonesia kelas 12 IPS 1",
				duration: 90,
				startTime,
				endTime,
				status: ExamStatus.PUBLISHED,
				totalQuestions: 8,
				totalScore: 100,
				randomizeQuestions: true,
				showResultImmediately: false,
				semesterId: activeSemester.id,
				subjectId: savedSubjects[1].id, // Bahasa Indonesia
			},
			// Bahasa Inggris Exams
			{
				title: "Ujian Bahasa Inggris - Kelas 10 IPA 1",
				description:
					"Ujian tengah semester untuk mata pelajaran Bahasa Inggris kelas 10 IPA 1",
				duration: 90,
				startTime,
				endTime,
				status: ExamStatus.PUBLISHED,
				totalQuestions: 8,
				totalScore: 100,
				randomizeQuestions: true,
				showResultImmediately: false,
				semesterId: activeSemester.id,
				subjectId: savedSubjects[2].id, // Bahasa Inggris
			},
			// Historical exam (previous semester)
			{
				title: "Ujian Matematika - Semester Ganjil 2024/2025",
				description:
					"Ujian akhir semester ganjil untuk mata pelajaran Matematika",
				duration: 90,
				startTime: new Date("2024-12-01T08:00:00"),
				endTime: new Date("2024-12-15T23:59:59"),
				status: ExamStatus.CLOSED,
				totalQuestions: 10,
				totalScore: 100,
				randomizeQuestions: true,
				showResultImmediately: true,
				semesterId: semesterGanjil2024.id,
				subjectId: savedSubjects[0].id, // Matematika
			},
		];

		const savedExams = [];
		for (const examData of examsData) {
			const exam = examRepo.create(examData);
			const savedExam = await examRepo.save(exam);
			savedExams.push(savedExam);
		}
		console.log("Exams created (5 exams across multiple subjects and classes)");

		// Create Questions for each exam
		const allQuestionsData = [
			// Questions for Matematika Kelas 12 IPA 1 (10 questions)
			{
				examId: savedExams[0].id,
				questionText: "Berapakah hasil dari 15 + 25?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["30", "35", "40", "45"],
				correctAnswer: "40",
				points: 10,
				orderIndex: 0,
			},
			{
				examId: savedExams[0].id,
				questionText: "Jika x = 5, maka 2x + 3 = ?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["10", "13", "15", "8"],
				correctAnswer: "13",
				points: 10,
				orderIndex: 1,
			},
			{
				examId: savedExams[0].id,
				questionText: "Apakah 2 + 2 = 4?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 10,
				orderIndex: 2,
			},
			{
				examId: savedExams[0].id,
				questionText: "Luas persegi dengan sisi 10 cm adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["100 cm²", "50 cm²", "200 cm²", "40 cm²"],
				correctAnswer: "100 cm²",
				points: 10,
				orderIndex: 3,
			},
			{
				examId: savedExams[0].id,
				questionText: "Berapakah akar kuadrat dari 144?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["10", "11", "12", "13"],
				correctAnswer: "12",
				points: 10,
				orderIndex: 4,
			},
			{
				examId: savedExams[0].id,
				questionText: "Nilai dari sin 90° adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["0", "0.5", "1", "-1"],
				correctAnswer: "1",
				points: 10,
				orderIndex: 5,
			},
			{
				examId: savedExams[0].id,
				questionText: "Turunan dari f(x) = 3x² adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["3x", "6x", "x²", "9x"],
				correctAnswer: "6x",
				points: 10,
				orderIndex: 6,
			},
			{
				examId: savedExams[0].id,
				questionText: "Hasil dari ∫ 2x dx adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["x²", "x² + C", "2x² + C", "2x"],
				correctAnswer: "x² + C",
				points: 10,
				orderIndex: 7,
			},
			{
				examId: savedExams[0].id,
				questionText: "Berapa nilai dari log₁₀(100)?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["1", "2", "10", "100"],
				correctAnswer: "2",
				points: 10,
				orderIndex: 8,
			},
			{
				examId: savedExams[0].id,
				questionText:
					"Apakah bilangan prima adalah bilangan yang hanya habis dibagi 1 dan dirinya sendiri?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 10,
				orderIndex: 9,
			},

			// Questions for Matematika Kelas 11 IPA 1 (8 questions)
			{
				examId: savedExams[1].id,
				questionText: "Hasil dari 8 × 7 adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["54", "56", "63", "64"],
				correctAnswer: "56",
				points: 12.5,
				orderIndex: 0,
			},
			{
				examId: savedExams[1].id,
				questionText: "Luas segitiga dengan alas 10 cm dan tinggi 8 cm adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["40 cm²", "80 cm²", "18 cm²", "160 cm²"],
				correctAnswer: "40 cm²",
				points: 12.5,
				orderIndex: 1,
			},
			{
				examId: savedExams[1].id,
				questionText: "Nilai dari cos 0° adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["0", "0.5", "1", "-1"],
				correctAnswer: "1",
				points: 12.5,
				orderIndex: 2,
			},
			{
				examId: savedExams[1].id,
				questionText: "Apakah 5 > 3?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 12.5,
				orderIndex: 3,
			},
			{
				examId: savedExams[1].id,
				questionText: "Hasil dari 2³ adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["4", "6", "8", "9"],
				correctAnswer: "8",
				points: 12.5,
				orderIndex: 4,
			},
			{
				examId: savedExams[1].id,
				questionText:
					"Keliling lingkaran dengan jari-jari 7 cm (π = 22/7) adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["22 cm", "44 cm", "154 cm", "88 cm"],
				correctAnswer: "44 cm",
				points: 12.5,
				orderIndex: 5,
			},
			{
				examId: savedExams[1].id,
				questionText: "Apakah hasil dari 10 ÷ 2 = 5?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 12.5,
				orderIndex: 6,
			},
			{
				examId: savedExams[1].id,
				questionText: "Nilai x dari persamaan 2x + 4 = 12 adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["2", "4", "6", "8"],
				correctAnswer: "4",
				points: 12.5,
				orderIndex: 7,
			},

			// Questions for Bahasa Indonesia Kelas 12 IPS 1 (8 questions)
			{
				examId: savedExams[2].id,
				questionText: "Apa yang dimaksud dengan kalimat efektif?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: [
					"Kalimat yang panjang",
					"Kalimat yang hemat kata",
					"Kalimat yang sesuai kaidah dan mudah dipahami",
					"Kalimat dengan banyak kata sifat",
				],
				correctAnswer: "Kalimat yang sesuai kaidah dan mudah dipahami",
				points: 12.5,
				orderIndex: 0,
			},
			{
				examId: savedExams[2].id,
				questionText: "Apakah puisi termasuk karya sastra?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 12.5,
				orderIndex: 1,
			},
			{
				examId: savedExams[2].id,
				questionText: "Kata baku dari 'aktifitas' adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["aktifitas", "aktivitas", "aktipitas", "aktifitaz"],
				correctAnswer: "aktivitas",
				points: 12.5,
				orderIndex: 2,
			},
			{
				examId: savedExams[2].id,
				questionText: "Apa fungsi tanda baca titik (.) dalam kalimat?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: [
					"Memisahkan kalimat",
					"Mengakhiri kalimat",
					"Menghubungkan kata",
					"Menandai pertanyaan",
				],
				correctAnswer: "Mengakhiri kalimat",
				points: 12.5,
				orderIndex: 3,
			},
			{
				examId: savedExams[2].id,
				questionText: "Apakah paragraf harus memiliki kalimat utama?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 12.5,
				orderIndex: 4,
			},
			{
				examId: savedExams[2].id,
				questionText: "Sinonim dari kata 'rajin' adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["malas", "tekun", "bodoh", "lambat"],
				correctAnswer: "tekun",
				points: 12.5,
				orderIndex: 5,
			},
			{
				examId: savedExams[2].id,
				questionText: "Antonim dari kata 'gelap' adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["terang", "redup", "suram", "kabur"],
				correctAnswer: "terang",
				points: 12.5,
				orderIndex: 6,
			},
			{
				examId: savedExams[2].id,
				questionText: "Apakah cerpen termasuk prosa fiksi?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 12.5,
				orderIndex: 7,
			},

			// Questions for Bahasa Inggris Kelas 10 IPA 1 (8 questions)
			{
				examId: savedExams[3].id,
				questionText: "What is the capital of Indonesia?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["Bandung", "Surabaya", "Jakarta", "Medan"],
				correctAnswer: "Jakarta",
				points: 12.5,
				orderIndex: 0,
			},
			{
				examId: savedExams[3].id,
				questionText: "Is 'cat' a noun?",
				type: QuestionType.TRUE_FALSE,
				options: ["True", "False"],
				correctAnswer: "True",
				points: 12.5,
				orderIndex: 1,
			},
			{
				examId: savedExams[3].id,
				questionText: "Choose the correct form: 'She ___ to school every day.'",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["go", "goes", "going", "gone"],
				correctAnswer: "goes",
				points: 12.5,
				orderIndex: 2,
			},
			{
				examId: savedExams[3].id,
				questionText: "What is the past tense of 'eat'?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["eated", "ate", "eaten", "eating"],
				correctAnswer: "ate",
				points: 12.5,
				orderIndex: 3,
			},
			{
				examId: savedExams[3].id,
				questionText: "Is 'quickly' an adverb?",
				type: QuestionType.TRUE_FALSE,
				options: ["True", "False"],
				correctAnswer: "True",
				points: 12.5,
				orderIndex: 4,
			},
			{
				examId: savedExams[3].id,
				questionText: "Which one is correct?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: [
					"He don't like coffee",
					"He doesn't like coffee",
					"He didn't likes coffee",
					"He doesn't likes coffee",
				],
				correctAnswer: "He doesn't like coffee",
				points: 12.5,
				orderIndex: 5,
			},
			{
				examId: savedExams[3].id,
				questionText: "The opposite of 'big' is?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["small", "large", "huge", "tall"],
				correctAnswer: "small",
				points: 12.5,
				orderIndex: 6,
			},
			{
				examId: savedExams[3].id,
				questionText: "Is 'I am' a correct form of 'be' verb?",
				type: QuestionType.TRUE_FALSE,
				options: ["True", "False"],
				correctAnswer: "True",
				points: 12.5,
				orderIndex: 7,
			},

			// Questions for Historical Matematika Exam (10 questions)
			{
				examId: savedExams[4].id,
				questionText: "Hasil dari 25 + 75 adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["90", "100", "110", "95"],
				correctAnswer: "100",
				points: 10,
				orderIndex: 0,
			},
			{
				examId: savedExams[4].id,
				questionText: "Jika y = 10, maka y/2 = ?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["2", "5", "10", "20"],
				correctAnswer: "5",
				points: 10,
				orderIndex: 1,
			},
			{
				examId: savedExams[4].id,
				questionText: "Apakah 3 × 3 = 9?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 10,
				orderIndex: 2,
			},
			{
				examId: savedExams[4].id,
				questionText: "Volume kubus dengan sisi 5 cm adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["25 cm³", "75 cm³", "125 cm³", "150 cm³"],
				correctAnswer: "125 cm³",
				points: 10,
				orderIndex: 3,
			},
			{
				examId: savedExams[4].id,
				questionText: "Berapakah akar kuadrat dari 81?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["7", "8", "9", "10"],
				correctAnswer: "9",
				points: 10,
				orderIndex: 4,
			},
			{
				examId: savedExams[4].id,
				questionText: "Nilai dari tan 45° adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["0", "0.5", "1", "√2"],
				correctAnswer: "1",
				points: 10,
				orderIndex: 5,
			},
			{
				examId: savedExams[4].id,
				questionText: "Turunan dari f(x) = x³ adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["x²", "3x²", "3x³", "x³"],
				correctAnswer: "3x²",
				points: 10,
				orderIndex: 6,
			},
			{
				examId: savedExams[4].id,
				questionText: "Hasil dari ∫ 3x² dx adalah?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["x³", "x³ + C", "3x³ + C", "3x²"],
				correctAnswer: "x³ + C",
				points: 10,
				orderIndex: 7,
			},
			{
				examId: savedExams[4].id,
				questionText: "Berapa nilai dari log₂(8)?",
				type: QuestionType.MULTIPLE_CHOICE,
				options: ["2", "3", "4", "8"],
				correctAnswer: "3",
				points: 10,
				orderIndex: 8,
			},
			{
				examId: savedExams[4].id,
				questionText: "Apakah 0 termasuk bilangan bulat?",
				type: QuestionType.TRUE_FALSE,
				options: ["Benar", "Salah"],
				correctAnswer: "Benar",
				points: 10,
				orderIndex: 9,
			},
		];

		for (const questionData of allQuestionsData) {
			const question = questionRepo.create(questionData);
			await questionRepo.save(question);
		}
		console.log("Questions created (52 questions across 5 exams)");

		console.log("\n✅ Seeding completed successfully!");
		console.log("\nLogin Credentials:");
		console.log("==================");
		console.log("Admin:");
		console.log("  Email: admin@ujian.com");
		console.log("  Password: admin123");
		console.log("\nTeacher:");
		console.log("  Email: guru.matematika@sekolah.com");
		console.log("  Password: guru123");
		console.log("\nStudent:");
		console.log("  NIS: 2024001");
		console.log("  Password: siswa123");
		console.log("==================");
		console.log("\nSeeded Data Summary:");
		console.log(
			"- 14 Application Settings (general, appearance, school, exam)"
		);
		console.log(
			"- 5 Semesters across 3 academic years (2023/2024, 2024/2025, 2025/2026)"
		);
		console.log("- 3 Subjects (Matematika, Bahasa Indonesia, Bahasa Inggris)");
		console.log("- 9 Classes (grades 10-12, IPA and IPS majors)");
		console.log("- 3 Teachers (Matematika, Bahasa Indonesia, Bahasa Inggris)");
		console.log("- 10 Student Accounts (Users with NIS: 2024001-2024010)");
		console.log(
			"- 17 Student Data records (10 in active semester + 7 historical across 3 students)"
		);
		console.log("- 2 Question Bank items");
		console.log(
			"- 5 Exams (4 active + 1 historical) across multiple subjects and classes"
		);
		console.log("- 52 Questions (distributed across all exams)");
		console.log("==================\n");

		await AppDataSource.destroy();
	} catch (error) {
		console.error("Error during seeding:", error);
		process.exit(1);
	}
}

seed();
