import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
	QuestionBank,
	DifficultyLevel,
	QuestionType,
} from "./question-bank.entity";
import { Subject } from "../subjects/subject.entity";
import { User } from "../users/user.entity";
import { CreateQuestionBankDto } from "./dto/create-question-bank.dto";
import { UpdateQuestionBankDto } from "./dto/update-question-bank.dto";

@Injectable()
export class QuestionBankService {
	constructor(
		@InjectRepository(QuestionBank)
		private questionBankRepository: Repository<QuestionBank>,
		@InjectRepository(Subject)
		private subjectRepository: Repository<Subject>,
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async create(
		createQuestionBankDto: CreateQuestionBankDto,
		creatorId: number
	): Promise<QuestionBank> {
		const subject = await this.subjectRepository.findOne({
			where: { id: createQuestionBankDto.subjectId },
		});

		if (!subject) {
			throw new NotFoundException(
				`Subject with ID ${createQuestionBankDto.subjectId} not found`
			);
		}

		const creator = await this.userRepository.findOne({
			where: { id: creatorId },
		});

		const questionBank = this.questionBankRepository.create({
			...createQuestionBankDto,
			subjectId: createQuestionBankDto.subjectId,
			createdById: creatorId,
		});

		return await this.questionBankRepository.save(questionBank);
	}

	async findAll(filters?: {
		subjectId?: number;
		difficulty?: DifficultyLevel;
		type?: QuestionType;
		tags?: string[];
		isActive?: boolean;
	}): Promise<QuestionBank[]> {
		const query = this.questionBankRepository
			.createQueryBuilder("qb")
			.leftJoinAndSelect("qb.subject", "subject")
			.leftJoinAndSelect("qb.createdBy", "creator");

		if (filters?.subjectId) {
			query.andWhere("qb.subjectId = :subjectId", {
				subjectId: filters.subjectId,
			});
		}

		if (filters?.difficulty) {
			query.andWhere("qb.difficulty = :difficulty", {
				difficulty: filters.difficulty,
			});
		}

		if (filters?.type) {
			query.andWhere("qb.type = :type", { type: filters.type });
		}

		if (filters?.isActive !== undefined) {
			query.andWhere("qb.isActive = :isActive", { isActive: filters.isActive });
		}

		if (filters?.tags && filters.tags.length > 0) {
			query.andWhere("qb.tags && :tags", { tags: filters.tags });
		}

		return await query.orderBy("qb.createdAt", "DESC").getMany();
	}

	async findOne(id: number): Promise<QuestionBank> {
		const questionBank = await this.questionBankRepository.findOne({
			where: { id },
			relations: ["subject", "createdBy"],
		});

		if (!questionBank) {
			throw new NotFoundException(`Question Bank with ID ${id} not found`);
		}

		return questionBank;
	}

	async findBySubject(subjectId: number): Promise<QuestionBank[]> {
		return await this.questionBankRepository.find({
			where: { subjectId, isActive: true },
			relations: ["subject", "createdBy"],
			order: { difficulty: "ASC", createdAt: "DESC" },
		});
	}

	async update(
		id: number,
		updateQuestionBankDto: UpdateQuestionBankDto
	): Promise<QuestionBank> {
		const questionBank = await this.findOne(id);

		const dto = updateQuestionBankDto as any;
		if (dto.subjectId && dto.subjectId !== questionBank.subjectId) {
			const subject = await this.subjectRepository.findOne({
				where: { id: dto.subjectId },
			});

			if (!subject) {
				throw new NotFoundException(
					`Subject with ID ${dto.subjectId} not found`
				);
			}

			questionBank.subjectId = dto.subjectId;
		}

		Object.assign(questionBank, updateQuestionBankDto);
		return await this.questionBankRepository.save(questionBank);
	}

	async remove(id: number): Promise<void> {
		const questionBank = await this.findOne(id);
		await this.questionBankRepository.remove(questionBank);
	}

	async incrementUsageCount(id: number): Promise<void> {
		await this.questionBankRepository.increment({ id }, "usageCount", 1);
	}

	async getStatsBySubject(subjectId: number): Promise<{
		total: number;
		byDifficulty: Record<string, number>;
		byType: Record<string, number>;
	}> {
		const questions = await this.findBySubject(subjectId);

		const byDifficulty: Record<string, number> = {};
		const byType: Record<string, number> = {};

		questions.forEach((q) => {
			byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
			byType[q.type] = (byType[q.type] || 0) + 1;
		});

		return {
			total: questions.length,
			byDifficulty,
			byType,
		};
	}
}
