/**
 * Service untuk memproses soal dengan opsi foto
 * Logika sederhana dan jelas:
 * 1. Validasi input
 * 2. Preserve optionImages
 * 3. Save ke database
 */
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { Question } from "./question.entity";

@Injectable()
export class QuestionPhotoService {
	constructor(
		@InjectRepository(Question)
		private questionsRepository: Repository<Question>
	) {}

	/**
	 * Process incoming question data - pastikan optionImages preserved
	 */
	processQuestionForSave(input: any): any {
		const processed = {
			...input,
			// Pastikan optionImages adalah array atau undefined
			optionImages: this.normalizeOptionImages(input.optionImages),
		};

		console.log("📸 [QuestionPhotoService] Processing question:", {
			id: processed.id,
			questionText: processed.questionText?.substring(0, 40),
			type: processed.type,
			optionImagesReceived: processed.optionImages,
			optionImagesCount: processed.optionImages?.length || 0,
		});

		return processed;
	}

	/**
	 * Normalize optionImages - convert to array atau undefined
	 */
	private normalizeOptionImages(images: any): string[] | undefined {
		if (!images) return undefined;
		if (!Array.isArray(images)) return undefined;
		if (images.length === 0) return undefined;

		// Filter out empty strings
		const filtered = images.filter(
			(img) => typeof img === "string" && img.trim()
		);
		return filtered.length > 0 ? filtered : undefined;
	}

	/**
	 * Save questions dengan optionImages ke database
	 * Gunakan transaction untuk atomic operation
	 */
	async saveQuestionsWithImages(
		questions: any[],
		examId: number,
		transactionManager?: EntityManager
	): Promise<Question[]> {
		const manager = transactionManager || this.questionsRepository.manager;

		console.log(
			"💾 [QuestionPhotoService] Saving",
			questions.length,
			"questions..."
		);

		const questionEntities = questions.map((q, idx) => {
			const processed = this.processQuestionForSave({
				...q,
				examId,
				orderIndex: q.orderIndex !== undefined ? q.orderIndex : idx,
			});

			console.log(`📝 Q${idx} akan disave:`, {
				id: processed.id,
				questionText: processed.questionText?.substring(0, 30),
				type: processed.type,
				optionImages: processed.optionImages,
				examId: processed.examId,
			});

			return manager.create(Question, processed);
		});

		console.log("📝 Total questions to save:", questionEntities.length);

		const saved = await manager.save(Question, questionEntities);

		console.log("✅ Questions saved successfully");

		// Verify optionImages after save
		saved.forEach((q, idx) => {
			console.log(
				`✔️ Q${idx} saved: id=${q.id}, optionImages=${JSON.stringify(q.optionImages)}`
			);
		});

		return saved;
	}

	/**
	 * Update questions dengan optionImages
	 * Simple: cari berdasarkan ID dan update fields
	 */
	async updateQuestionWithImages(
		id: number,
		data: any,
		transactionManager?: EntityManager
	): Promise<Question> {
		const manager = transactionManager || this.questionsRepository.manager;

		const question = await manager.findOne(Question, { where: { id } });
		if (!question) throw new Error(`Question ${id} not found`);

		// Process data untuk pastikan optionImages handled correctly
		const processed = this.processQuestionForSave(data);

		console.log(`📝 [QuestionPhotoService] Updating Q${id}:`, {
			questionText: processed.questionText?.substring(0, 30),
			optionImages: processed.optionImages,
		});

		// Update fields
		Object.assign(question, processed);

		// Explicit set optionImages
		if (processed.optionImages) {
			question.optionImages = processed.optionImages;
		}

		console.log(`✔️ Q${id} sebelum save:`, {
			optionImages: question.optionImages,
		});

		const updated = await manager.save(Question, question);

		console.log(`✔️ Q${id} setelah save:`, {
			optionImages: updated.optionImages,
		});

		return updated;
	}
}
