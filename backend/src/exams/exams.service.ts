import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Exam, ExamStatus } from "./exam.entity";
import { CreateExamDto, UpdateExamDto } from "./dto/exam.dto";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { Question } from "../questions/question.entity";
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
					JSON.stringify(questions, null, 2)
				);

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
					const questionEntities = questions.map((q: any, index: number) =>
						transactionalEntityManager.create(Question, {
							...q,
							points: Number(q.points) || 1,
							examId: savedExam.id,
							orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
						})
					);
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
		const exam = await this.examsRepository.findOne({
			where: { id },
			relations: ["questions", "class", "semester", "subject"],
			order: {
				questions: {
					orderIndex: "ASC",
				},
			},
		});

		if (!exam) {
			throw new NotFoundException("Exam not found");
		}

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

		let query = this.examsRepository
			.createQueryBuilder("exam")
			.where("exam.status = :status", { status: ExamStatus.PUBLISHED })
			.andWhere("exam.startTime <= :now", { now })
			.andWhere("exam.endTime >= :now", { now })
			.leftJoinAndSelect("exam.questions", "questions")
			.leftJoinAndSelect("exam.class", "class")
			.leftJoinAndSelect("exam.semester", "semester");

		// Filter by student's class if provided
		if (classId) {
			console.log(`🔍 Filtering exams by classId: ${classId}`);
			query = query.andWhere("exam.classId = :classId", { classId });
		} else {
			console.log(`⚠️  No classId provided, returning all active exams`);
		}

		const results = await query.orderBy("exam.startTime", "ASC").getMany();
		console.log(`✅ Found ${results.length} exams for classId: ${classId}`);
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

	async findByClass(classId: number): Promise<Exam[]> {
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

		// Extract questions from update payload
		const questions = (updateExamDto as any).questions;
		delete (updateExamDto as any).questions;

		console.log(
			"📥 Update exam",
			id,
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
				if (questions !== undefined) {
					if (!Array.isArray(questions)) {
						throw new BadRequestException("Questions must be an array");
					}

					// Client explicitly wants to clear questions
					if (questions.length === 0) {
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
							}
						);
						const existingById = new Map<number, Question>();
						existingQuestions.forEach((eq) => existingById.set(eq.id, eq));

						const incomingIds: number[] = [];
						let totalScore = 0;
						const toUpdate: Question[] = [];
						const toCreate: Question[] = [];

						for (let index = 0; index < questions.length; index++) {
							const q: any = questions[index];
							// basic validation
							if (!q.questionText || !q.type) {
								throw new BadRequestException(
									"Each question must have questionText and type"
								);
							}
							const normalized = {
								...q,
								options: Array.isArray(q?.options) ? q.options : undefined,
								correctAnswer:
									typeof q?.correctAnswer === "string"
										? q.correctAnswer
										: undefined,
								points: Number(q.points) || 0,
								orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
							};
							totalScore += normalized.points;
							if (normalized.id) {
								incomingIds.push(Number(normalized.id));
								const exist = existingById.get(Number(normalized.id));
								if (exist) {
									exist.questionText = normalized.questionText;
									exist.type = normalized.type;
									exist.options = normalized.options ?? exist.options;
									exist.correctAnswer =
										normalized.correctAnswer ?? exist.correctAnswer;
									exist.points = normalized.points ?? exist.points;
									exist.imageUrl = normalized.imageUrl ?? exist.imageUrl;
									exist.orderIndex = normalized.orderIndex ?? exist.orderIndex;
									toUpdate.push(exist);
								} else {
									// id provided but not found — treat as create
									toCreate.push(
										transactionalEntityManager.create(Question, {
											...normalized,
											examId: id,
										})
									);
								}
							} else {
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
						if (toDelete.length > 0) {
							console.log(
								"🗑️ Deleting questions with ids:",
								JSON.stringify(toDelete)
							);
							await transactionalEntityManager.delete(Question, toDelete);
						}

						// Update exam aggregates
						exam.totalScore = totalScore;
						exam.totalQuestions = questions.length;
						await transactionalEntityManager.save(exam);
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
		// Questions will be cascade deleted due to onDelete: 'CASCADE' in entity
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
}
