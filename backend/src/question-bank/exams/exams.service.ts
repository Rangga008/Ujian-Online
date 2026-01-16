import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Exam, ExamStatus, ExamTargetType } from "./exam.entity";
import { CreateExamDto, UpdateExamDto } from "./dto/exam.dto";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { Question } from "../questions/question.entity";
import { Student } from "../students/student.entity";
import { Submission } from "../submissions/submission.entity";
import { Answer } from "../submissions/answer.entity";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "../activity/activity.entity";

@Injectable()
export class ExamsService {
	constructor(
		@InjectRepository(Exam)
		private examsRepository: Repository<Exam>,
		@InjectRepository(Semester)
		private semestersRepository: Repository<Semester>,
		@InjectRepository(Class)
		private classesRepository: Repository<Class>,
		@InjectRepository(Question)
		private questionsRepository: Repository<Question>,
		@InjectRepository(Student)
		private studentsRepository: Repository<Student>,
		@InjectRepository(Submission)
		private submissionsRepository: Repository<Submission>,
		private activityService: ActivityService
	) {}

	async create(createExamDto: CreateExamDto, actorId?: number): Promise<Exam> {
		// Use transaction for atomic operation
		return await this.examsRepository.manager.transaction(
			async (transactionalEntityManager) => {
				// If no semester provided, assign active semester automatically
				let payload = { ...createExamDto } as any;
				if (!payload.semesterId) {
					const activeSemester = await transactionalEntityManager.findOne(
						Semester,
						{
							where: { isActive: true },
						}
					);
					if (activeSemester) {
						payload.semesterId = activeSemester.id;
					}
				}

				if (payload.classId) {
					const cls = await transactionalEntityManager.findOne(Class, {
						where: { id: payload.classId },
					});
					if (!cls) throw new NotFoundException("Class not found");
					if (!payload.semesterId && cls.semesterId) {
						payload.semesterId = cls.semesterId;
					}
				}

				// Extract questions from payload
				const questions = payload.questions || [];
				delete payload.questions;

				console.log(
					"📥 Questions received in create():",
					questions.map((q: any) => ({
						questionText: q.questionText?.substring(0, 30),
						type: q.type,
						hasOptionImages: !!q.optionImages,
						optionImagesCount: q.optionImages?.length || 0,
						optionImagesPreview: q.optionImages
							?.slice(0, 2)
							.map((img: string) => img?.substring(0, 50)),
					}))
				);

				// Debug: Log full first question to see all fields
				if (questions.length > 0) {
					console.log(
						"🔍 First question (full object):",
						JSON.stringify(questions[0], null, 2)
					);
				}

				// Debug: Log all field keys for each question
				questions.forEach((q, i) => {
					console.log(`📋 Q${i} fields:`, Object.keys(q));
				});

				// Calculate total score from questions
				if (questions.length > 0) {
					payload.totalScore = questions.reduce(
						(sum: number, q: any) => sum + (Number(q.points) || 0),
						0
					);
					payload.totalQuestions = questions.length;
				} // Create and save exam
				const exam = transactionalEntityManager.create(Exam, payload);
				const savedExam = await transactionalEntityManager.save(Exam, exam);

				// Create questions if provided
				if (questions.length > 0) {
					const questionEntities = questions.map((q: any, index: number) => {
						console.log(
							`🔍 Q${index} before create - optionImages:`,
							q.optionImages
						);
						return transactionalEntityManager.create(Question, {
							...q,
							points: Number(q.points) || 1,
							examId: savedExam.id,
							orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
						});
					});
					console.log(
						"📝 Question entities to save:",
						JSON.stringify(questionEntities, null, 2)
					);
					await transactionalEntityManager.save(Question, questionEntities);
					console.log("✅ Questions saved successfully");
				}
				// Reload exam with relations
				const result = await transactionalEntityManager.findOne(Exam, {
					where: { id: savedExam.id },
					relations: ["questions", "class", "semester", "subject"],
				});
				// Log activity if actorId provided
				try {
					if (actorId) {
						await this.activityService.log(
							actorId,
							ActivityType.CREATE,
							"exam",
							savedExam.id,
							"Created Exam",
							{ examId: savedExam.id }
						);
					}
				} catch (err) {
					console.error("Activity log failed for exam create", err);
				}

				return result;
			}
		);
	}
	async findAll(status?: ExamStatus): Promise<Exam[]> {
		const where = status ? { status } : {};
		return this.examsRepository.find({
			where,
			relations: ["questions", "class", "semester"],
			order: { createdAt: "DESC" },
		});
	}

	async findOne(id: number): Promise<Exam> {
		const exam = await this.examsRepository
			.createQueryBuilder("exam")
			.where("exam.id = :id", { id })
			.leftJoinAndSelect("exam.questions", "questions")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester")
			.leftJoinAndSelect("exam.subject", "subject")
			.orderBy("questions.orderIndex", "ASC")
			.addOrderBy("exam.createdAt", "DESC")
			.getOne();

		if (!exam) {
			throw new NotFoundException("Exam not found");
		}

		// Log what we're returning
		console.log(
			"📋 Exam from DB:",
			JSON.stringify(
				{
					id: exam.id,
					title: exam.title,
					questionsCount: exam.questions?.length,
					firstQuestion: exam.questions?.[0]
						? {
								id: exam.questions[0].id,
								text: exam.questions[0].questionText,
								options: exam.questions[0].options,
								optionImages: exam.questions[0].optionImages,
								correctAnswer: exam.questions[0].correctAnswer,
								points: exam.questions[0].points,
							}
						: null,
				},
				null,
				2
			)
		);

		// Ensure questions are sorted by orderIndex
		if (exam.questions) {
			exam.questions.sort((a, b) => a.orderIndex - b.orderIndex);
		}

		return exam;
	}

	async findActiveExams(): Promise<Exam[]> {
		const now = new Date();
		return this.examsRepository
			.createQueryBuilder("exam")
			.where("exam.status = :status", { status: ExamStatus.PUBLISHED })
			.andWhere("exam.startTime <= :now", { now })
			.andWhere("exam.endTime >= :now", { now })
			.leftJoinAndSelect("exam.questions", "questions")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester")
			.orderBy("exam.startTime", "ASC")
			.getMany();
	}

	async findAllExams(): Promise<Exam[]> {
		const allExams = await this.examsRepository
			.createQueryBuilder("exam")
			.leftJoinAndSelect("exam.questions", "questions")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester")
			.getMany();

		console.log(`📊 Total exams in database: ${allExams.length}`);
		allExams.forEach((e) => {
			console.log(
				`  - Exam ${e.id}: "${e.title}", classId: ${e.classId}, status: ${e.status}, start: ${e.startTime}, end: ${e.endTime}`
			);
		});
		return allExams;
	}

	async findActiveExamsByStudent(classId?: number): Promise<Exam[]> {
		const now = new Date();
		console.log(
			`📝 Fetching exams for classId: ${classId}, current time: ${now}`
		);

		// DEBUG: First, let's see ALL exams in the system regardless of status
		const allExams = await this.examsRepository.find();
		console.log(`🔍 TOTAL EXAMS IN DATABASE: ${allExams.length}`);
		allExams.forEach((e) => {
			console.log(
				`  - Exam ID: ${e.id}, Title: "${e.title}", Status: ${e.status}, ClassId: ${e.classId}, TargetType: ${e.targetType}, Grade: ${e.grade}, EndTime: ${e.endTime}`
			);
		});

		// DEBUG: Let's also check ALL classes to see which one has ID 45
		const allClasses = await this.classesRepository.find();
		console.log(`🔍 TOTAL CLASSES IN DATABASE: ${allClasses.length}`);
		allClasses.forEach((c) => {
			console.log(
				`  - Class ID: ${c.id}, Name: "${c.name}", Grade: ${c.grade}, Major: ${c.major}`
			);
		});

		// Get student's class information to check grade-based exams
		let studentGradeNumeric: number | null = null;
		let studentGradeFormatted: string | null = null;
		if (classId) {
			const studentClass = await this.classesRepository.findOne({
				where: { id: classId },
			});
			if (studentClass) {
				studentGradeNumeric = studentClass.grade; // e.g., 10, 11, 12
				studentGradeFormatted = `Kelas ${studentClass.grade}`; // e.g., "Kelas 10", "Kelas 11", "Kelas 12"
				console.log(
					`📚 Student class grade numeric: ${studentGradeNumeric}, formatted: ${studentGradeFormatted}`
				);
				console.log(
					`📚 Student class details: ID=${studentClass.id}, Name="${studentClass.name}", Grade=${studentClass.grade}, Major=${studentClass.major}`
				);
			} else {
				console.log(`⚠️  No class found with ID ${classId}`);
			}
		}

		// Debug: Check all published exams for this class
		const debugQuery = this.examsRepository
			.createQueryBuilder("exam")
			.where("exam.status = :status", { status: ExamStatus.PUBLISHED });

		if (classId) {
			debugQuery.andWhere(
				"(exam.targetType = :classTarget AND exam.classId = :classId) OR (exam.targetType = :gradeTarget AND exam.grade = :gradeFormatted)",
				{
					classTarget: ExamTargetType.CLASS,
					classId,
					gradeTarget: ExamTargetType.GRADE,
					gradeFormatted: studentGradeFormatted,
				}
			);
		}

		const allPublishedExams = await debugQuery.getMany();
		console.log(
			`📋 Total PUBLISHED exams matching class ${classId}: ${allPublishedExams.length}`
		);
		allPublishedExams.forEach((e) => {
			console.log(
				`  ✓ Exam: "${e.title}", ClassId: ${e.classId}, TargetType: ${e.targetType}, StartTime: ${e.startTime}, EndTime: ${e.endTime}, Status: ${e.status}`
			);
		});

		// FIXED: Changed logic to show exams that are:
		// 1. PUBLISHED status (not yet started, ready to take)
		// 2. ONGOING status (currently active, students can still take)
		// But NOT DRAFT (not yet published) or CLOSED (exam ended)
		let query = this.examsRepository
			.createQueryBuilder("exam")
			.where("exam.status IN (:...statuses)", {
				statuses: [ExamStatus.PUBLISHED, ExamStatus.ONGOING],
			})
			.andWhere("exam.endTime >= :now", { now }) // Only show exams that haven't ended
			.leftJoinAndSelect("exam.questions", "questions")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester");

		// Filter by student's class OR by grade if it matches
		if (classId) {
			console.log(
				`🔍 Filtering exams by classId: ${classId} or grade: ${studentGradeFormatted}`
			);
			// If targetType is CLASS, must match classId; if targetType is GRADE, must match grade
			// For grade matching, also check if it starts with "Kelas" or "SMA"/"SMK"
			query = query.andWhere(
				"(exam.targetType = :classTarget AND exam.classId = :classId) OR (exam.targetType = :gradeTarget AND (exam.grade = :gradeFormatted OR exam.grade LIKE :gradeWildcard))",
				{
					classTarget: ExamTargetType.CLASS,
					classId,
					gradeTarget: ExamTargetType.GRADE,
					gradeFormatted: studentGradeFormatted,
					gradeWildcard: `%${studentGradeNumeric}%`, // Match "Kelas 12", "SMA 12", "SMA 12 (SMA)", etc.
				}
			);
		} else {
			console.log(
				`⚠️  No classId provided, returning all active exams without class filter`
			);
		}

		const results = await query.orderBy("exam.startTime", "ASC").getMany();
		console.log(
			`✅ Found ${results.length} exams for classId: ${classId}, grade: ${studentGradeFormatted}`
		);
		results.forEach((e) => {
			console.log(
				`  - Exam: ${e.title}, startTime: ${e.startTime}, endTime: ${e.endTime}, status: ${e.status}`
			);
		});
		return results;
	}

	async getSchedule(
		startDate?: string,
		endDate?: string,
		semesterId?: number
	): Promise<Exam[]> {
		const query = this.examsRepository
			.createQueryBuilder("exam")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester")
			.leftJoinAndSelect("exam.subject", "subject")
			.orderBy("exam.startTime", "ASC");

		if (startDate) {
			query.andWhere("exam.startTime >= :startDate", { startDate });
		}

		if (endDate) {
			query.andWhere("exam.endTime <= :endDate", { endDate });
		}

		if (semesterId) {
			query.andWhere("exam.semesterId = :semesterId", {
				semesterId: Number(semesterId),
			});
		}

		return query.getMany();
	}

	/**
	 * Re-grade all answers in submissions for an exam after question edits
	 * Recalculates isCorrect and points for all answers based on current question data
	 */
	private async regradeSubmissions(
		examId: number,
		manager: any
	): Promise<void> {
		console.log(`🔄 Re-grading all submissions for exam ${examId}...`);

		// Get all submissions for this exam with their answers and questions
		const submissions = await manager.find(Submission, {
			where: { examId },
			relations: ["answers", "answers.question"],
		});

		const QuestionType = {
			ESSAY: "essay",
			TRUE_FALSE: "true_false",
			MULTIPLE_CHOICE: "multiple_choice",
			MIXED_MULTIPLE_CHOICE: "mixed_multiple_choice",
		};

		for (const submission of submissions) {
			if (!submission.answers || submission.answers.length === 0) continue;

			const answersToUpdate: Answer[] = [];

			for (const answer of submission.answers) {
				const question = answer.question;
				if (!question) continue;

				let isCorrect = false;
				const given = (answer.answer || "")
					.toString()
					.replace(/\s+/g, " ")
					.trim()
					.toLowerCase();
				let correct = (question.correctAnswer || "")
					.toString()
					.replace(/\s+/g, " ")
					.trim()
					.toLowerCase();

				// Recalculate correctness based on question type
				if (question.type === QuestionType.MULTIPLE_CHOICE) {
					// Map numeric index or letter to option text if possible
					if (/^\d+$/.test(correct) && Array.isArray(question.options)) {
						const idx = Number(correct);
						if (idx >= 0 && idx < question.options.length) {
							correct = (question.options[idx] || "")
								.toString()
								.replace(/\s+/g, " ")
								.trim()
								.toLowerCase();
						}
					} else if (
						/^[A-Za-z]$/.test(correct) &&
						Array.isArray(question.options)
					) {
						const idx = correct.toUpperCase().charCodeAt(0) - 65;
						if (idx >= 0 && idx < question.options.length) {
							correct = (question.options[idx] || "")
								.toString()
								.replace(/\s+/g, " ")
								.trim()
								.toLowerCase();
						}
					}
					isCorrect = correct === given;
				} else if (question.type === QuestionType.MIXED_MULTIPLE_CHOICE) {
					// Parse and compare token arrays
					const parseTokens = (str: string) => {
						const raw = (str || "").toString().trim();
						if (!raw) return [] as string[];

						if (/^\s*\d+(\s*,\s*\d+)*\s*$/.test(raw)) {
							const nums = raw
								.split(/\s*,\s*/)
								.map((n) => Number(n))
								.filter((n) => !Number.isNaN(n));
							if (
								Array.isArray(question.options) &&
								question.options.length > 0
							) {
								return nums
									.map((idx) => question.options[idx])
									.filter(Boolean)
									.map((p) =>
										(p || "")
											.toString()
											.replace(/\s+/g, " ")
											.trim()
											.toLowerCase()
									);
							}
							return nums.map((n) => String(n));
						}

						return raw
							.split(/[;,|\/]+|\s*,\s*/)
							.map((p) => p.trim())
							.filter(Boolean)
							.map((p) =>
								(p || "").toString().replace(/\s+/g, " ").trim().toLowerCase()
							);
					};

					const a = parseTokens(correct).sort();
					const b = parseTokens(given).sort();
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
						isCorrect = correct === given;
					}
				} else {
					// Essay or other types: no auto-grading
					isCorrect = false;
				}

				// For essay questions, preserve existing points (manually graded by teacher)
				// For other types, calculate points based on correctness
				let points = isCorrect ? question.points : 0;
				if (question.type === QuestionType.ESSAY) {
					// Preserve existing points for essays - don't reset them
					points = answer.points ?? 0;
				}

				// Update answer
				answer.isCorrect = isCorrect;
				answer.points = points;
				answersToUpdate.push(answer);
			}

			// Save all updated answers
			if (answersToUpdate.length > 0) {
				await manager.save(Answer, answersToUpdate);
				console.log(
					`✅ Re-graded ${answersToUpdate.length} answers for submission ${submission.id}`
				);
			}

			// Recalculate submission score
			const totalPoints = submission.answers.reduce(
				(sum, a) => sum + (a.points || 0),
				0
			);
			submission.score = totalPoints;
			await manager.save(submission);
		}

		console.log(`✅ Re-grading complete for exam ${examId}`);
	}

	async findByClass(classId: number): Promise<Exam[]> {
		// Get the class information to check its grade for grade-based exams
		const classInfo = await this.classesRepository.findOne({
			where: { id: classId },
		});

		// If class has a grade, also include grade-based exams using pattern matching
		if (classInfo && classInfo.grade) {
			const gradeFormatted = `Kelas ${classInfo.grade}`;
			const gradeNumeric = classInfo.grade;

			console.log(
				`DEBUG findByClass: classId=${classId}, grade=${gradeFormatted}, gradeNumeric=${gradeNumeric}`
			);

			// Use QueryBuilder for OR condition with LIKE pattern for grade matching
			const results = await this.examsRepository
				.createQueryBuilder("exam")
				.where(
					"exam.classId = :classId OR (exam.targetType = :gradeTarget AND exam.grade LIKE :gradeWildcard)",
					{
						classId,
						gradeTarget: ExamTargetType.GRADE,
						gradeWildcard: `%${gradeNumeric}%`, // Match "Kelas 12", "SMA 12", "SMA 12 (SMA)", etc.
					}
				)
				.leftJoinAndSelect("exam.questions", "questions")
				.leftJoinAndSelect("exam.class", "class")
				.leftJoinAndSelect("exam.semester", "semester")
				.orderBy("exam.startTime", "DESC")
				.getMany();

			console.log(
				`DEBUG findByClass: Found ${results.length} exams for class ${classId} (grade ${gradeNumeric})`
			);
			results.forEach((e) => {
				console.log(
					`  - Exam: "${e.title}", classId: ${e.classId}, targetType: ${e.targetType}, grade: "${e.grade}"`
				);
			});

			return results;
		}

		// If no grade info, just return class-based exams
		console.log(
			`DEBUG findByClass: No grade info for class ${classId}, using classId only`
		);
		return this.examsRepository.find({
			where: { classId },
			relations: ["questions", "class", "semester"],
			order: { startTime: "DESC" },
		});
	}

	async update(
		id: number,
		updateExamDto: UpdateExamDto,
		actorId?: number
	): Promise<Exam> {
		const exam = await this.findOne(id);

		// Check if there are any submissions for this exam
		const submissionCount = await this.submissionsRepository.count({
			where: { examId: id },
		});

		const hasSubmissions = submissionCount > 0;

		// Extract questions from update payload
		let questions = (updateExamDto as any).questions;
		const isOnlyMetadataUpdate = questions === undefined;

		// Note: we allow question payloads even when submissions exist.
		// The update logic below will avoid deleting existing questions when
		// submissions are present and will attempt to upsert by id or orderIndex.

		delete (updateExamDto as any).questions;

		console.log(
			"📥 Update exam",
			id,
			"- Type:",
			isOnlyMetadataUpdate ? "METADATA ONLY" : "WITH QUESTIONS",
			"- Questions received:",
			questions?.length || 0
		);
		// Log incoming update payload (without questions) for diagnostics
		const payloadPreview = { ...updateExamDto } as any;
		if (payloadPreview.questions) delete payloadPreview.questions;
		console.log(
			"🔁 Update payload preview:",
			JSON.stringify(payloadPreview, null, 2)
		);

		// Log questions detail BEFORE processing
		if (questions && questions.length > 0) {
			console.log(
				"📋 Questions detail (first 3):",
				questions.slice(0, 3).map((q: any) => ({
					id: q.id,
					type: q.type,
					text: q.questionText?.substring(0, 40),
					hasId: !!q.id,
					optionImages: q.optionImages,
					hasOptionImages: !!q.optionImages && q.optionImages.length > 0,
				}))
			);
		}

		// Use transaction to ensure atomic update
		return await this.examsRepository.manager.transaction(
			async (transactionalEntityManager) => {
				// Update exam properties
				Object.assign(exam, updateExamDto);

				// Ensure classId is explicitly set when provided in the DTO
				if (Object.prototype.hasOwnProperty.call(updateExamDto, "classId")) {
					const incomingClassId: any = (updateExamDto as any).classId;
					exam.classId = incomingClassId ? Number(incomingClassId) : null;
					// If a valid classId is provided, attempt to load the Class entity so relation is available
					if (exam.classId) {
						try {
							const cls = await transactionalEntityManager.findOne(Class, {
								where: { id: exam.classId },
							});
							if (cls) exam.class = cls;
						} catch (err) {
							console.warn(
								"Failed to load class for exam update:",
								err?.message || err
							);
						}
					} else {
						exam.class = null as any;
					}
				}

				// If targetType is explicitly provided, ensure related fields are consistent
				if (Object.prototype.hasOwnProperty.call(updateExamDto, "targetType")) {
					const incomingTarget: any = (updateExamDto as any).targetType;
					if (incomingTarget === "class") {
						// For class-targeted exam, clear grade
						exam.grade = null as any;
						// If classId wasn't provided in DTO, keep existing classId; otherwise it's already set above
					} else if (incomingTarget === "grade") {
						// For grade-targeted exam, clear class relation
						exam.classId = null as any;
						exam.class = null as any;
					}
				}
				// Avoid assigning an empty questions array which may trigger relation persistence
				if (exam.questions) delete (exam as any).questions;
				console.log("💾 Saving exam (initial):", JSON.stringify(exam, null, 2));
				try {
					await transactionalEntityManager.save(exam);
				} catch (err) {
					console.error("❌ Error saving exam (initial):", err);
					throw err;
				}

				// Handle questions update if provided
				// SKIP question handling if this is ONLY a metadata update
				if (questions !== undefined) {
					if (!Array.isArray(questions)) {
						throw new BadRequestException("Questions must be an array");
					}

					// Client explicitly wants to clear questions
					if (questions.length === 0) {
						if (hasSubmissions) {
							throw new BadRequestException(
								"Cannot delete all questions - this exam has student submissions. Preserve questions to maintain answer integrity."
							);
						}
						await transactionalEntityManager.delete(Question, { examId: id });
						exam.totalScore = 0;
						exam.totalQuestions = 0;
						await transactionalEntityManager.save(exam);
					} else {
						// Upsert incoming questions: update existing ones by id, create new ones, delete omitted ones
						const existingQuestions = await transactionalEntityManager.find(
							Question,
							{
								where: { examId: id },
								order: { orderIndex: "ASC" },
							}
						);
						const existingById = new Map<number, Question>();
						existingQuestions.forEach((eq) => existingById.set(eq.id, eq));

						console.log(
							"📊 Existing questions in DB:",
							existingQuestions.map((q) => ({
								id: q.id,
								orderIndex: q.orderIndex,
								text: q.questionText?.substring(0, 40),
							}))
						);
						console.log(
							"🔑 Existing question IDs in Map:",
							Array.from(existingById.keys())
						);

						const incomingIds: number[] = [];
						let totalScore = 0;
						const toUpdate: Question[] = [];
						const toCreate: Question[] = [];

						console.log(
							"📥 EXAM UPDATE: Received questions from payload:",
							JSON.stringify(
								questions.map((q: any, idx: number) => ({
									idx,
									id: q.id,
									type: q.type,
									text: q.questionText?.substring(0, 30),
								})),
								null,
								2
							)
						);

						// ⚠️ CRITICAL: Detect mixed IDs (some with, some without)
						// This is a sign that questions were added/removed incorrectly
						const questionsWithIds = questions.filter((q: any) => q.id);
						const questionsWithoutIds = questions.filter((q: any) => !q.id);

						if (questionsWithIds.length > 0 && questionsWithoutIds.length > 0) {
							console.warn(
								`⚠️ MIXED ID STATE: ${questionsWithIds.length} questions have IDs, ${questionsWithoutIds.length} don't!`
							);
							console.warn(
								"   This can cause duplication! Existing questions:"
							);
							existingQuestions.forEach((eq) => {
								console.warn(
									`   - ID ${eq.id}: "${eq.questionText?.substring(0, 30)}"`
								);
							});
							console.warn("   Incoming questions with IDs:");
							questionsWithIds.forEach((q: any) => {
								console.warn(
									`   - ID ${q.id}: "${q.questionText?.substring(0, 30)}"`
								);
							});
							console.warn(
								"   Incoming questions WITHOUT IDs (will create as new):"
							);
							questionsWithoutIds.forEach((q: any, idx: number) => {
								console.warn(
									`   - [NEW #${idx}]: "${q.questionText?.substring(0, 30)}"`
								);
							});
						}

						for (let index = 0; index < questions.length; index++) {
							const q: any = questions[index];
							// basic validation
							if (!q.questionText || !q.type) {
								throw new BadRequestException(
									"Each question must have questionText and type"
								);
							}

							console.log(
								`📋 Processing question ${index + 1}:`,
								`ID=${q.id}, Text="${q.questionText.substring(0, 50)}..."`
							);

							const normalized = {
								...q,
								options: Array.isArray(q?.options) ? q.options : undefined,
								correctAnswer:
									typeof q?.correctAnswer === "string"
										? q.correctAnswer
										: undefined,
								points: Number(q.points) || 0,
								orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
								optionImages: Array.isArray(q?.optionImages)
									? q.optionImages
									: undefined,
							};
							console.log(
								`📸 Normalized optionImages for Q${index}: ${normalized.optionImages?.join(", ")}`
							);
							totalScore += normalized.points;

							// Check if this is an update (has matching ID) or create (no ID or new ID)
							let existsInDb = normalized.id
								? existingById.has(Number(normalized.id))
								: false;

							if (normalized.id && existsInDb) {
								// UPDATE existing question
								incomingIds.push(Number(normalized.id));
								const exist = existingById.get(Number(normalized.id));
								if (exist) {
									console.log(`  → Updating question ID ${exist.id}`);
									exist.questionText = normalized.questionText;
									exist.type = normalized.type;
									exist.options = normalized.options ?? exist.options;
									exist.imageUrl = normalized.imageUrl ?? exist.imageUrl;
									exist.optionImages =
										normalized.optionImages ?? exist.optionImages;
									exist.allowPhotoAnswer =
										normalized.allowPhotoAnswer ?? exist.allowPhotoAnswer;
									exist.orderIndex = normalized.orderIndex ?? exist.orderIndex;

									// ⚠️ CRITICAL: If submissions exist, do NOT update correctAnswer or points
									// These affect how existing answers are scored
									// Updating them would break the integrity of submitted exams
									if (hasSubmissions) {
										console.log(
											`  ⚠️ Submissions exist - NOT updating correctAnswer/points for Q${exist.id}`
										);
										// Keep existing correctAnswer and points
									} else {
										exist.correctAnswer =
											normalized.correctAnswer ?? exist.correctAnswer;
										exist.points = normalized.points ?? exist.points;
									}

									toUpdate.push(exist);
								}
							} else {
								// CREATE new question (either no ID or ID not found in DB)
								console.log(
									`  → Creating new question (no ID or not found in DB)`
								);
								toCreate.push(
									transactionalEntityManager.create(Question, {
										...normalized,
										examId: id,
									})
								);
							}
						}

						// Ensure examId is assigned and log payloads for diagnostics
						if (toUpdate.length > 0) {
							console.log(
								"📝 Updating questions:",
								JSON.stringify(toUpdate, null, 2)
							);
							for (const uq of toUpdate) {
								if (!uq.examId) uq.examId = id;
							}
							try {
								await transactionalEntityManager.save(Question, toUpdate);
							} catch (err) {
								console.error("❌ Error saving updated questions:", err);
								throw err;
							}
						}
						if (toCreate.length > 0) {
							console.log(
								"📝 Creating questions:",
								JSON.stringify(toCreate, null, 2)
							);
							for (const cq of toCreate) {
								if (!cq.examId) cq.examId = id;
							}
							try {
								await transactionalEntityManager.save(Question, toCreate);
							} catch (err) {
								console.error("❌ Error saving created questions:", err);
								throw err;
							}
						}

						// Delete questions that were not included in the payload
						const existingIds = existingQuestions.map((eq) => eq.id);
						const toDelete = existingIds.filter(
							(eid) => !incomingIds.includes(eid)
						);

						// ⚠️ IMPORTANT: Only delete questions if there are NO submissions
						// If there are submissions, preserve questions to maintain answer integrity
						// Students' answers reference these questions, so deleting them would cascade
						// delete their answers and break the submission records
						if (toDelete.length > 0) {
							if (hasSubmissions) {
								console.log(
									"⚠️ NOT deleting questions because submissions exist. Preserving question history:"
								);
								toDelete.forEach((qid) => {
									console.log(
										`  - Question ID ${qid} will be kept (has ${submissionCount} submissions)`
									);
								});
								// Don't delete - keep questions to preserve answer integrity
							} else {
								console.log(
									"🗑️ Deleting questions NOT in payload (no submissions exist):",
									JSON.stringify(toDelete)
								);
								await transactionalEntityManager.delete(Question, toDelete);
							}
						}

						// Update exam aggregates
						// Recalculate based on what we actually saved
						const allCurrentQuestions = await transactionalEntityManager.find(
							Question,
							{ where: { examId: id } }
						);

						// ⚠️ If submissions exist, don't recalculate totalScore
						// because we're preserving old questions and their points
						if (!hasSubmissions) {
							exam.totalScore = allCurrentQuestions.reduce(
								(sum, q) => sum + (q.points || 0),
								0
							);
							exam.totalQuestions = allCurrentQuestions.length;
							console.log(
								`📊 Recalculated totals (no submissions): ${exam.totalQuestions} questions, ${exam.totalScore} points`
							);
						} else {
							// With submissions, only update count if questions were added
							exam.totalQuestions = allCurrentQuestions.length;
							console.log(
								`📊 Total questions (submissions exist): ${exam.totalQuestions} questions, score kept at ${exam.totalScore}`
							);
						}

						// If submissions exist and questions were updated, re-grade all answers
						if (
							hasSubmissions &&
							(toUpdate.length > 0 || toCreate.length > 0)
						) {
							console.log(
								`📊 Questions were updated and submissions exist. Re-grading submissions...`
							);
							await this.regradeSubmissions(id, transactionalEntityManager);
						}
					}
				}

				// Reload exam with updated questions
				const updatedExam = await transactionalEntityManager.findOne(Exam, {
					where: { id },
					relations: ["questions", "class", "semester", "subject"],
					order: {
						questions: {
							orderIndex: "ASC",
						},
					},
				});

				// Debug logging for class relation
				console.log(`🔍 After update - Exam ID ${id}:`, {
					classId: updatedExam?.classId,
					classLoaded: !!updatedExam?.class,
					className: updatedExam?.class?.name,
					semesterLoaded: !!updatedExam?.semester,
					semesterName: updatedExam?.semester?.name,
				});

				// Ensure questions are sorted by orderIndex
				if (updatedExam?.questions) {
					updatedExam.questions.sort((a, b) => a.orderIndex - b.orderIndex);
				}

				// Log activity if actorId provided
				try {
					if (actorId) {
						await this.activityService.log(
							actorId,
							ActivityType.UPDATE,
							"exam",
							id,
							"Updated Exam",
							{ examId: id }
						);
					}
				} catch (err) {
					console.error("Activity log failed for exam update", err);
				}

				return updatedExam;
			}
		);
	}

	async remove(id: number, actorId?: number): Promise<void> {
		const exam = await this.findOne(id);

		// Fix database column to allow NULL first time
		try {
			await this.examsRepository.manager.query(
				`ALTER TABLE submissions MODIFY COLUMN examId INT NULL`
			);
		} catch (err) {
			// Column might already be nullable, ignore error
		}

		// Nullify examId in submissions first (to remove foreign key constraint)
		await this.examsRepository.manager
			.createQueryBuilder()
			.update("submissions")
			.set({ examId: null })
			.where("examId = :examId", { examId: id })
			.execute();

		// Get all questions for this exam
		const questions = await this.questionsRepository.find({
			where: { examId: id },
		});

		// Delete answers associated with all questions first
		if (questions.length > 0) {
			const questionIds = questions.map((q) => q.id);
			await this.examsRepository.manager
				.createQueryBuilder()
				.delete()
				.from("answers")
				.where("questionId IN (:...questionIds)", { questionIds })
				.execute();
		}

		// Delete all questions
		await this.questionsRepository.delete({ examId: id });

		// Then delete the exam
		await this.examsRepository.remove(exam);

		try {
			if (actorId) {
				await this.activityService.log(
					actorId,
					ActivityType.DELETE,
					"exam",
					id,
					"Deleted Exam",
					{ examId: id }
				);
			}
		} catch (err) {
			console.error("Activity log failed for exam delete", err);
		}
	}

	async updateStatus(id: number, status: ExamStatus): Promise<Exam> {
		const exam = await this.findOne(id);
		exam.status = status;
		return this.examsRepository.save(exam);
	}

	/**
	 * Generate a random 6-character alphanumeric token for an exam
	 */
	private generateRandomToken(): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let token = "";
		for (let i = 0; i < 6; i++) {
			token += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return token;
	}

	/**
	 * Generate and assign a token to an exam
	 */
	async generateToken(id: number): Promise<{ token: string }> {
		const exam = await this.findOne(id);
		const token = this.generateRandomToken();
		exam.token = token;
		exam.requireToken = true;
		await this.examsRepository.save(exam);
		console.log(`🔑 Generated token for exam ${id}: ${token}`);
		return { token };
	}

	/**
	 * Validate a token for an exam
	 */
	async validateToken(examId: number, providedToken: string): Promise<boolean> {
		const exam = await this.findOne(examId);
		if (!exam.requireToken) {
			return true; // No token required
		}
		if (!exam.token) {
			return false; // Token required but not set
		}
		return exam.token === providedToken.toUpperCase();
	}
}
