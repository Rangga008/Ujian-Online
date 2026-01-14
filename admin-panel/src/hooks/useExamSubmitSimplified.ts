/**
 * SIMPLIFIED hook untuk submit exam dengan photo options
 * Logika step-by-step yang jelas dan mudah dipahami
 */
import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Question } from "@/types/exam";
import { compressImageBrowser } from "@/lib/imageCompression";

export function useExamSubmitSimplified() {
	const [loading, setLoading] = useState(false);

	/**
	 * Step 1: Upload satu file ke server
	 * Return URL dari server (/uploads/filename)
	 */
	const uploadSingleFile = async (file: File): Promise<string> => {
		const fd = new FormData();
		fd.append("file", file);
		const res = await api.post("/settings/upload", fd, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		const url = res.data.path || res.data.url;
		console.log(`✅ File uploaded: ${file.name} → ${url}`);
		return url;
	};

	/**
	 * Step 2: Compress dan upload satu option image
	 */
	const uploadOptionImage = async (
		file: File,
		optionIndex: number
	): Promise<string> => {
		console.log(`📸 Uploading option ${optionIndex} image: ${file.name}`);
		try {
			const compressed = await compressImageBrowser(file, 1920, 0.75);
			const url = await uploadSingleFile(compressed.file);
			return url;
		} catch (err) {
			console.error(`❌ Failed to compress option ${optionIndex}:`, err);
			// Fallback: upload without compression
			return await uploadSingleFile(file);
		}
	};

	/**
	 * Step 3: Build question object untuk kirim ke backend
	 * PENTING: preserve optionImages dan semua field lainnya
	 */
	const buildQuestionPayload = (
		question: Question,
		optionImageUrls: string[]
	) => {
		console.log(`📋 Building payload for Q${question.id || "new"}:`, {
			text: question.questionText?.substring(0, 30),
			type: question.type,
			optionImages: optionImageUrls,
		});

		const payload: any = {
			// Include ID jika ada (untuk update)
			...(question.id && { id: question.id }),

			// Teks pertanyaan
			questionText: question.questionText,
			type: question.type,
			points: Number(question.points) || 1,
			orderIndex: question.orderIndex || 0,

			// Image pertanyaan
			imageUrl: question.imageUrl || "",
		};

		// Handle berdasarkan type soal
		if (question.type === "essay") {
			payload.options = [];
			payload.correctAnswer = "";
		} else if (question.type === "true_false") {
			payload.options = ["Benar", "Salah"];
			payload.correctAnswer = String(question.correctAnswer || "");
		} else {
			// Multiple choice
			payload.options = question.options || [];
			payload.correctAnswer = String(question.correctAnswer || "");
			payload.optionImages = optionImageUrls;
		}

		console.log(`✔️ Q${question.id || "new"} payload built:`, {
			options: payload.options?.length || 0,
			optionImages: payload.optionImages?.length || 0,
		});

		return payload;
	};

	/**
	 * Step 4: Process satu soal
	 * Upload images, build payload
	 */
	const processQuestion = async (
		question: Question,
		questionIndex: number
	): Promise<any> => {
		console.log(`\n🔄 Processing question ${questionIndex + 1}...`);

		// Upload exam image jika ada
		let examImageUrl = question.imageUrl || "";
		if (question.imageFile) {
			try {
				const compressed = await compressImageBrowser(
					question.imageFile,
					1920,
					0.75
				);
				examImageUrl = await uploadSingleFile(compressed.file);
			} catch (err) {
				examImageUrl = await uploadSingleFile(question.imageFile);
			}
		}

		// Upload option images
		const optionImageUrls: string[] = [];

		if (question.type === "multiple_choice") {
			// Check mana ada files atau existing URLs
			const hasNewFiles =
				question.optionImageFiles &&
				Array.isArray(question.optionImageFiles) &&
				question.optionImageFiles.length > 0;

			if (hasNewFiles) {
				console.log(
					`📸 Question ${questionIndex + 1}: Has ${
						question.optionImageFiles!.length
					} new image files`
				);

				// Upload each new file
				for (let i = 0; i < question.optionImageFiles!.length; i++) {
					const file = question.optionImageFiles![i];
					if (file) {
						const url = await uploadOptionImage(file, i);
						optionImageUrls.push(url);
					} else {
						optionImageUrls.push("");
					}
				}
			} else if (question.optionImages && question.optionImages.length > 0) {
				// Use existing URLs dari database
				console.log(
					`📸 Question ${questionIndex + 1}: Using existing ${
						question.optionImages.length
					} images from DB`
				);
				optionImageUrls.push(...question.optionImages);
			}

			console.log(
				`✅ Question ${questionIndex + 1} option images:`,
				optionImageUrls
			);
		}

		// Build final payload
		const payload = buildQuestionPayload(question, optionImageUrls);

		// Add exam image URL ke payload
		payload.imageUrl = examImageUrl;

		return payload;
	};

	/**
	 * Step 5: Process SEMUA soal
	 * Map each question through processQuestion
	 */
	const processAllQuestions = async (questions: Question[]): Promise<any[]> => {
		console.log(
			"\n═══════════════════════════════════════════════════════════"
		);
		console.log(`🚀 Processing ${questions.length} questions...`);
		console.log("═══════════════════════════════════════════════════════════");

		const processedQuestions = await Promise.all(
			questions.map((q, idx) => processQuestion(q, idx))
		);

		console.log("\n📋 All questions processed:");
		processedQuestions.forEach((q, idx) => {
			console.log(
				`  Q${idx + 1}: options=${q.options?.length || 0}, optionImages=${
					q.optionImages?.length || 0
				}`
			);
		});
		console.log(
			"═══════════════════════════════════════════════════════════\n"
		);

		return processedQuestions;
	};

	/**
	 * Step 6: Submit exam ke backend
	 */
	const submitExam = async (
		examId: number,
		formData: any,
		questions: Question[],
		examImageFile: File | null,
		isCreate: boolean = false
	) => {
		setLoading(true);

		try {
			console.log("\n🎯 STARTING EXAM SUBMISSION...\n");

			// 1. Validate basic data
			if (!formData.title?.trim()) {
				toast.error("Judul ujian harus diisi");
				return;
			}

			if (questions.length === 0) {
				toast.error("Tambahkan minimal 1 soal");
				return;
			}

			// 2. Process all questions
			const processedQuestions = await processAllQuestions(questions);

			// 3. Upload exam image jika ada
			let examImageUrl = formData.imageUrl || "";
			if (examImageFile) {
				try {
					const compressed = await compressImageBrowser(
						examImageFile,
						1920,
						0.75
					);
					examImageUrl = await uploadSingleFile(compressed.file);
				} catch {
					examImageUrl = await uploadSingleFile(examImageFile);
				}
			}

			// 4. Build final exam payload
			const payload: any = {
				title: formData.title,
				description: formData.description,
				semesterId: Number(formData.semesterId),
				targetType: formData.targetType,
				startTime: formData.startTime,
				endTime: formData.endTime,
				imageUrl: examImageUrl,
				// PENTING: INCLUDE QUESTIONS WITH optionImages
				questions: processedQuestions,
			};

			// Add class/grade jika ada
			if (formData.classId) {
				payload.classId = Number(formData.classId);
			} else if (formData.gradeId) {
				payload.gradeId = Number(formData.gradeId);
			}

			console.log("\n📤 PAYLOAD TO SEND TO BACKEND:");
			console.log(
				JSON.stringify(
					{
						title: payload.title,
						questionsCount: payload.questions.length,
						firstQuestion: payload.questions[0]
							? {
									id: payload.questions[0].id,
									type: payload.questions[0].type,
									optionImagesCount:
										payload.questions[0].optionImages?.length || 0,
									optionImages: payload.questions[0].optionImages?.slice(0, 2),
							  }
							: null,
					},
					null,
					2
				)
			);

			// 5. Send ke backend
			const endpoint = isCreate ? "/exams" : `/exams/${examId}`;
			const method = isCreate ? "post" : "put";

			console.log(`\n🔗 Sending ${method.toUpperCase()} to ${endpoint}...\n`);

			const response = await api[method](endpoint, payload);

			console.log("✅ SUCCESS!", response.data);
			toast.success(`Ujian ${isCreate ? "dibuat" : "diupdate"} berhasil`);

			return response.data;
		} catch (err: any) {
			console.error("❌ ERROR:", err);
			const message = err.response?.data?.message || err.message;
			toast.error(`Gagal: ${message}`);
			throw err;
		} finally {
			setLoading(false);
		}
	};

	return {
		loading,
		submitExam,
	};
}
