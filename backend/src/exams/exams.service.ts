import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Exam, ExamStatus } from "./exam.entity";
import { CreateExamDto, UpdateExamDto } from "./dto/exam.dto";
import { Semester } from "../semesters/semester.entity";
import { Class } from "../classes/class.entity";
import { Question } from "../questions/question.entity";

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
		private questionsRepository: Repository<Question>
	) {}

	async create(createExamDto: CreateExamDto): Promise<Exam> {
		// If no semester provided, assign active semester automatically
		let payload = { ...createExamDto } as any;
		if (!payload.semesterId) {
			const activeSemester = await this.semestersRepository.findOne({
				where: { isActive: true },
			});
			if (activeSemester) {
				payload.semesterId = activeSemester.id;
			}
		}

		if (payload.classId) {
			const cls = await this.classesRepository.findOne({
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

		// Create exam
		const exam = this.examsRepository.create(payload);
		const savedExam = await this.examsRepository.save(exam);
		const examId = (savedExam as any).id || savedExam[0]?.id;

		// Create questions if provided
		if (questions.length > 0) {
			const questionEntities = questions.map((q: any) =>
				this.questionsRepository.create({
					...q,
					examId: examId,
				})
			);
			await this.questionsRepository.save(questionEntities);
		}

		// Reload exam with questions
		return this.findOne(examId);
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
			relations: ["questions", "class", "semester"],
		});

		if (!exam) {
			throw new NotFoundException("Exam not found");
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

	async update(id: number, updateExamDto: UpdateExamDto): Promise<Exam> {
		const exam = await this.findOne(id);
		Object.assign(exam, updateExamDto);
		return this.examsRepository.save(exam);
	}

	async remove(id: number): Promise<void> {
		const exam = await this.findOne(id);
		await this.examsRepository.remove(exam);
	}

	async updateStatus(id: number, status: ExamStatus): Promise<Exam> {
		const exam = await this.findOne(id);
		exam.status = status;
		return this.examsRepository.save(exam);
	}
}
