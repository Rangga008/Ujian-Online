import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Submission, SubmissionStatus } from "./submission.entity";
import { Answer } from "./answer.entity";
import { CreateSubmissionDto, SubmitAnswerDto } from "./dto/submission.dto";
import { QuestionsService } from "../questions/questions.service";
import { Student } from "../students/student.entity";
import { Semester } from "../semesters/semester.entity";

@Injectable()
export class SubmissionsService {
	constructor(
		@InjectRepository(Submission)
		private submissionsRepository: Repository<Submission>,
		@InjectRepository(Answer)
		private answersRepository: Repository<Answer>,
		@InjectRepository(Student)
		private studentRepository: Repository<Student>,
		@InjectRepository(Semester)
		private semesterRepository: Repository<Semester>,
		private questionsService: QuestionsService
	) {}

	async startExam(studentId: number, examId: number): Promise<Submission> {
		// If there's an in-progress submission, resume it
		const existingInProgress = await this.submissionsRepository.findOne({
			where: { studentId, examId, status: SubmissionStatus.IN_PROGRESS },
		});

		if (existingInProgress) {
			return existingInProgress;
		}

		// If there's already a submitted submission, do not allow starting again
		const existingSubmitted = await this.submissionsRepository.findOne({
			where: { studentId, examId, status: SubmissionStatus.SUBMITTED },
		});

		if (existingSubmitted) {
			throw new BadRequestException("You have already submitted this exam");
		}

		const submission = this.submissionsRepository.create({
			studentId,
			examId,
			status: SubmissionStatus.IN_PROGRESS,
			startedAt: new Date(),
		});

		return this.submissionsRepository.save(submission);
	}

	async submitAnswer(
		submissionId: number,
		submitAnswerDto: SubmitAnswerDto
	): Promise<Answer> {
		const submission = await this.submissionsRepository.findOne({
			where: { id: submissionId },
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		if (submission.status !== SubmissionStatus.IN_PROGRESS) {
			throw new BadRequestException("Submission is not in progress");
		}

		const question = await this.questionsService.findOne(
			submitAnswerDto.questionId
		);

		// Check if answer already exists
		let answer = await this.answersRepository.findOne({
			where: {
				submissionId,
				questionId: submitAnswerDto.questionId,
			},
		});

		const isCorrect = question.correctAnswer === submitAnswerDto.answer;
		const points = isCorrect ? question.points : 0;

		if (answer) {
			answer.answer = submitAnswerDto.answer;
			answer.isCorrect = isCorrect;
			answer.points = points;
		} else {
			answer = this.answersRepository.create({
				submissionId,
				questionId: submitAnswerDto.questionId,
				answer: submitAnswerDto.answer,
				isCorrect,
				points,
			});
		}

		return this.answersRepository.save(answer);
	}

	async submitExam(
		submissionId: number,
		studentId: number
	): Promise<Submission> {
		const submission = await this.submissionsRepository.findOne({
			where: { id: submissionId, studentId },
			relations: ["answers"],
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		if (submission.status !== SubmissionStatus.IN_PROGRESS) {
			throw new BadRequestException("Submission is not in progress");
		}

		const totalScore = submission.answers.reduce(
			(sum, answer) => sum + answer.points,
			0
		);

		submission.status = SubmissionStatus.SUBMITTED;
		submission.submittedAt = new Date();
		submission.score = totalScore;
		submission.totalAnswered = submission.answers.length;

		return this.submissionsRepository.save(submission);
	}

	async findByStudent(studentId: number): Promise<Submission[]> {
		return this.submissionsRepository.find({
			where: { studentId },
			relations: ["exam"],
			order: { createdAt: "DESC" },
		});
	}

	async findByExam(examId: number): Promise<Submission[]> {
		return this.submissionsRepository.find({
			where: { examId },
			relations: ["student", "student.user", "answers"],
			order: { submittedAt: "DESC" },
		});
	}

	async findOne(id: number): Promise<Submission> {
		const submission = await this.submissionsRepository.findOne({
			where: { id },
			relations: [
				"student",
				"student.user",
				"exam",
				"answers",
				"answers.question",
			],
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		return submission;
	}

	async gradeSubmission(
		id: number,
		payload: { answers?: { id: number; points: number }[]; score?: number }
	) {
		const submission = await this.submissionsRepository.findOne({
			where: { id },
			relations: ["answers"],
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		// Update individual answer points if provided
		if (payload.answers && payload.answers.length > 0) {
			for (const a of payload.answers) {
				const ans = submission.answers.find((x) => x.id === a.id);
				if (!ans) continue;
				ans.points = a.points;
				ans.isCorrect = a.points > 0;
				await this.answersRepository.save(ans);
			}
		}

		// Recalculate total score unless explicitly provided
		let total = submission.answers.reduce((s, x) => s + (x.points || 0), 0);
		if (typeof payload.score === "number") {
			submission.score = payload.score;
		} else {
			submission.score = total;
		}

		// Ensure submission marked as submitted
		submission.status = submission.status || submission.status;
		submission.totalAnswered = submission.answers.length;

		return this.submissionsRepository.save(submission);
	}

	async exportCsv(filters: {
		semesterId?: number;
		classId?: number;
		examId?: number;
		studentId?: number;
	}) {
		const qb = this.submissionsRepository
			.createQueryBuilder("s")
			.leftJoinAndSelect("s.student", "student")
			.leftJoinAndSelect("student.user", "user")
			.leftJoinAndSelect("s.exam", "exam");

		if (filters.semesterId) {
			qb.andWhere("student.semesterId = :semesterId", {
				semesterId: filters.semesterId,
			});
		}

		if (filters.classId) {
			qb.andWhere("student.classId = :classId", { classId: filters.classId });
		}

		if (filters.examId) {
			qb.andWhere("s.examId = :examId", { examId: filters.examId });
		}

		if (filters.studentId) {
			qb.andWhere("student.id = :studentId", { studentId: filters.studentId });
		}

		qb.orderBy("s.submittedAt", "DESC");

		const rows = await qb.getMany();

		// Build CSV
		const header = [
			"Submission ID",
			"Exam ID",
			"Exam Title",
			"Student ID",
			"Student Name",
			"NIS",
			"Class ID",
			"Status",
			"Score",
			"Total Answered",
			"Submitted At",
		];

		const lines = [header.join(",")];

		for (const s of rows) {
			const line = [
				s.id,
				s.examId,
				`"${(s.exam && s.exam.title) || ""}"`,
				s.studentId,
				`"${(s.student && s.student.name) || ""}"`,
				`"${(s.student && s.student.user && s.student.user.nis) || ""}"`,
				(s.student && s.student.classId) || "",
				s.status,
				s.score ?? "",
				s.totalAnswered ?? "",
				s.submittedAt ? s.submittedAt.toISOString() : "",
			];
			lines.push(line.join(","));
		}

		return lines.join("\n");
	}

	// Helper method to get student ID from user ID and active semester
	async getStudentIdFromUserId(userId: number): Promise<number> {
		const activeSemester = await this.semesterRepository.findOne({
			where: { isActive: true },
		});

		if (!activeSemester) {
			throw new BadRequestException("No active semester found");
		}

		const student = await this.studentRepository.findOne({
			where: { userId, semesterId: activeSemester.id },
		});

		if (!student) {
			throw new NotFoundException("Student data not found for active semester");
		}

		return student.id;
	}

	// Method to find by userId (converts to studentId automatically)
	async findByUserId(userId: number): Promise<Submission[]> {
		const studentId = await this.getStudentIdFromUserId(userId);
		return this.findByStudent(studentId);
	}
}
