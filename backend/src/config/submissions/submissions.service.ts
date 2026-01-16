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
import { ExamsService } from "../exams/exams.service";
import { QuestionType } from "../questions/question.entity";
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
		private questionsService: QuestionsService,
		private examsService: ExamsService
	) {}

	async startExam(
		studentId: number,
		examId: number,
		token?: string
	): Promise<Submission> {
		// Validate token if exam requires it
		const isTokenValid = await this.examsService.validateToken(
			examId,
			token || ""
		);
		if (!isTokenValid) {
			throw new BadRequestException("Invalid or missing exam token");
		}

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

		// Handle photo answers
		if (submitAnswerDto.photoAnswer) {
			// For photo answers, store the photo URL/data directly
			if (!answer) {
				answer = this.answersRepository.create({
					submissionId,
					questionId: submitAnswerDto.questionId,
					answer: null, // No text answer for photo
					answerImageUrl: submitAnswerDto.photoAnswer,
					isCorrect: false, // Photo answers need manual grading
					points: 0,
				});
			} else {
				answer.answerImageUrl = submitAnswerDto.photoAnswer;
				answer.isCorrect = false; // Reset correctness since answer changed
				answer.points = 0;
			}
			return this.answersRepository.save(answer);
		}

		// Tolerant comparison: normalize strings, handle multi-select and true/false variants
		// Ensure answer is converted to a string for comparison and storage
		const rawAnswer = (submitAnswerDto as any).answer;
		const storedAnswerValue =
			rawAnswer === null || rawAnswer === undefined
				? null
				: typeof rawAnswer === "string"
					? rawAnswer
					: JSON.stringify(rawAnswer);

		const normalize = (s?: string) => {
			let t = (s ?? "").toString().replace(/\s+/g, " ").trim();
			// Remove surrounding quotes/backticks if present
			t = t.replace(/^(["'`]+)|(["'`]+)$/g, "");
			// Remove common checkmark/tick characters and other visual markers
			t = t.replace(
				/[\u2713\u2714\u2715\u2716\u2717\u2718\u2719\u271A\u271B\u271C\u271D\u271E\u271F\u2720\u2712\u2711√✓✔✗✘]/g,
				""
			);
			return t.toLowerCase();
		};

		let isCorrect = false;
		// keep the raw string for multi-select parsing
		const rawGiven = storedAnswerValue ?? "";
		// normalized single-value answer for non-multiple parsing
		const given = normalize(rawGiven);
		// Prepare canonical correct answer for comparison. For multiple_choice, support
		// numeric indices or single-letter tokens by mapping them to the option text when possible.
		let correct = normalize(question.correctAnswer);
		if (question.type === QuestionType.MULTIPLE_CHOICE) {
			// If correct looks like a numeric index and options are available, map to option text
			if (/^\d+$/.test(correct) && Array.isArray(question.options)) {
				const idx = Number(correct);
				if (idx >= 0 && idx < question.options.length) {
					correct = normalize(question.options[idx]);
				}
			} else if (
				/^[A-Za-z]$/.test(correct) &&
				Array.isArray(question.options)
			) {
				const idx = correct.toUpperCase().charCodeAt(0) - 65;
				if (idx >= 0 && idx < question.options.length) {
					correct = normalize(question.options[idx]);
				}
			}
		}

		if (question.type === QuestionType.MIXED_MULTIPLE_CHOICE) {
			const parseTokens = (str: string) => {
				const raw = (str || "").toString().trim();
				if (!raw) return [] as string[];

				// First check if it's a JSON array (from Flutter or other clients)
				if (raw.startsWith("[") && raw.endsWith("]")) {
					try {
						const parsed = JSON.parse(raw);
						if (Array.isArray(parsed)) {
							return parsed.map((p) => normalize(String(p)));
						}
					} catch (e) {
						// Not valid JSON, continue with other parsing
					}
				}

				// If tokens are purely numeric (e.g. "0,2" or "1,3"), map to option texts when possible
				if (/^\s*\d+(\s*,\s*\d+)*\s*$/.test(raw)) {
					const nums = raw
						.split(/\s*,\s*/)
						.map((n) => Number(n))
						.filter((n) => !Number.isNaN(n));
					if (Array.isArray(question.options) && question.options.length > 0) {
						return nums
							.map((idx) => question.options[idx])
							.filter(Boolean)
							.map((p) => normalize(p));
					}
					return nums.map((n) => String(n));
				}

				// Otherwise split on commas (and tolerate other separators) and normalize
				return raw
					.split(/[;,|\/]+|\s*,\s*/)
					.map((p) => p.trim())
					.filter(Boolean)
					.map((p) => normalize(p));
			};

			// Parse tokens from the original stored strings (don't use pre-normalized values)
			const a = parseTokens(question.correctAnswer as string).sort();
			const b = parseTokens(rawGiven as string).sort();
			isCorrect = JSON.stringify(a) === JSON.stringify(b);
		} else if (question.type === QuestionType.TRUE_FALSE) {
			const trueSet = new Set(["benar", "true", "t", "ya", "y", "1"]);
			const falseSet = new Set([
				"salah",
				"false",
				"f",
				"tidak",
				"no",
				"n",
				"0",
			]);
			const caTrue = trueSet.has(correct);
			const caFalse = falseSet.has(correct);
			const ansTrue = trueSet.has(given);
			const ansFalse = falseSet.has(given);
			if (caTrue || caFalse) {
				isCorrect = (caTrue && ansTrue) || (caFalse && ansFalse);
			} else {
				// Fallback to string equality
				isCorrect = correct === given;
			}
		} else {
			isCorrect = correct === given;
		}

		const points = isCorrect ? question.points : 0;

		if (answer) {
			answer.answer = storedAnswerValue;
			answer.answerImageUrl = null; // Clear photo if text answer provided
			answer.isCorrect = isCorrect;
			answer.points = points;
		} else {
			answer = this.answersRepository.create({
				submissionId,
				questionId: submitAnswerDto.questionId,
				answer: storedAnswerValue,
				answerImageUrl: null,
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
			relations: ["student", "student.user", "student.class", "answers"],
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

	// Delete a submission
	async delete(id: number): Promise<any> {
		const submission = await this.submissionsRepository.findOne({
			where: { id },
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		// Delete all answers associated with this submission
		await this.answersRepository.delete({ submissionId: id });

		// Delete the submission
		await this.submissionsRepository.delete(id);

		return { message: "Submission deleted successfully" };
	}
}
