import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Question, Grade } from "@/types/exam";
import { compressImageBrowser, formatFileSize } from "@/lib/imageCompression";
import {
	uploadImageFile,
	uploadOptionImages,
	dataUrlToFile,
	validateOptionImages,
} from "@/lib/imageHandler";

interface UseExamSubmitProps {
	questions: Question[];
	grades: Grade[];
	formData: any;
	examImageFile: File | null;
}

export function useExamSubmit({
	questions,
	grades,
	formData,
	examImageFile,
}: UseExamSubmitProps) {
	const [loading, setLoading] = useState(false);

	const validateForm = (): boolean => {
		// Validate basic fields
		if (!formData.title.trim()) {
			toast.error("Judul ujian harus diisi");
			return false;
		}
		if (!formData.description.trim()) {
			toast.error("Deskripsi harus diisi");
			return false;
		}
		if (!formData.semesterId) {
			toast.error("Pilih semester");
			return false;
		}
		if (formData.targetType === "class" && !formData.classId) {
			toast.error("Pilih kelas");
			return false;
		}
		if (formData.targetType === "grade" && !formData.gradeId) {
			toast.error("Pilih angkatan");
			return false;
		}
		if (!formData.startTime || !formData.endTime) {
			toast.error("Waktu mulai dan selesai harus diisi");
			return false;
		}

		// Parse local datetime without timezone conversion
		// Input format: "2026-01-16T11:10" (local time from user)
		const parseLocalDateTime = (dateTimeStr: string): Date => {
			const [date, time] = dateTimeStr.split("T");
			const [year, month, day] = date.split("-").map(Number);
			const [hour, minute] = time.split(":").map(Number);
			return new Date(year, month - 1, day, hour, minute, 0);
		};

		const startDate = parseLocalDateTime(formData.startTime);
		const endDate = parseLocalDateTime(formData.endTime);
		if (startDate >= endDate) {
			toast.error("Waktu selesai harus lebih besar dari waktu mulai");
			return false;
		}

		// Validate questions
		if (questions.length === 0) {
			toast.error("Tambahkan minimal 1 soal");
			return false;
		}

		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			if (!q.questionText.trim()) {
				toast.error(`Soal ${i + 1}: Pertanyaan harus diisi`);
				return false;
			}
			if (!q.points || q.points <= 0) {
				toast.error(`Soal ${i + 1}: Poin harus lebih dari 0`);
				return false;
			}
			if (q.type === "essay") continue;
			if (q.type === "true_false") {
				if (!q.correctAnswer) {
					toast.error(`Soal ${i + 1}: Pilih Benar atau Salah`);
					return false;
				}
				continue;
			}

			// For multiple choice questions, count options that have either text OR image
			const filledOptions = (q.options || []).filter((o, idx) => {
				const hasText = o.trim() !== "";
				const hasImage =
					(q as any).optionImagePreviews?.[idx] ||
					(q as any).optionImages?.[idx];
				return hasText || hasImage;
			});
			if (filledOptions.length < 2) {
				toast.error(`Soal ${i + 1}: Minimal 2 pilihan diisi`);
				return false;
			}
			if (
				!q.correctAnswer ||
				(typeof q.correctAnswer === "string" && !q.correctAnswer.trim())
			) {
				toast.error(`Soal ${i + 1}: Pilih jawaban benar`);
				return false;
			}
		}

		return true;
	};

	const uploadImage = async (file: File): Promise<string> => {
		try {
			const result = await uploadImageFile(file, true);
			return result.url;
		} catch (error: any) {
			console.error("Image upload error:", error);
			throw error;
		}
	};

	const processQuestions = async (): Promise<any[]> => {
		console.log(
			"🔄 processQuestions - Input questions from state:",
			questions.map((q: any) => ({
				id: q.id,
				type: q.type,
				text: q.questionText?.substring(0, 30),
			}))
		);

		const processedQuestions = await Promise.all(
			questions.map(async (q, idx) => {
				let imageUrl = "";

				// Upload image if present
				if (q.imageFile) {
					try {
						const compressed = await compressImageBrowser(
							q.imageFile,
							1920,
							0.75
						);
						imageUrl = await uploadImage(compressed.file);
					} catch (err) {
						console.error("Image compression failed:", err);
						imageUrl = await uploadImage(q.imageFile);
					}
				} else if (q.imageUrl && q.imageUrl.startsWith("data:image/")) {
					// Handle base64 image data from UI (convert to file and upload)
					console.log(`🖼️ Q${idx}: Converting base64 imageUrl to file`);
					try {
						const file = dataUrlToFile(q.imageUrl, `question-${idx}.png`);
						if (file) {
							const compressed = await compressImageBrowser(file, 1920, 0.75);
							imageUrl = await uploadImage(compressed.file);
						}
					} catch (err) {
						console.error("Base64 image conversion/upload failed:", err);
						imageUrl = "";
					}
				}

				// Coerce and validate points to ensure backend receives a number >= 1
				let points = typeof q.points === "number" ? q.points : Number(q.points);
				if (Number.isNaN(points) || points < 1) points = 1;

				// Upload option images if present
				let optionImages: string[] = [];
				console.log(`📸 Q${idx}: All question properties:`, Object.keys(q));
				console.log(`📸 Q${idx}: Processing option images`, {
					hasOptionImageFiles: !!q.optionImageFiles,
					optionImageFilesLength: q.optionImageFiles?.length,
					hasOptionImagePreviews: !!q.optionImagePreviews,
					optionImagePreviewsLength: q.optionImagePreviews?.length,
				});

				// Collect files to upload (keep null positions!)
				let filesToUpload: (File | null)[] = [];

				if (
					q.optionImageFiles &&
					Array.isArray(q.optionImageFiles) &&
					q.optionImageFiles.length > 0
				) {
					// Use uploaded files directly (with nulls preserved for position mapping)
					console.log(
						`📸 Q${idx}: Using optionImageFiles:`,
						q.optionImageFiles.length,
						"files to upload"
					);
					filesToUpload = q.optionImageFiles;
				} else if (
					q.optionImagePreviews &&
					Array.isArray(q.optionImagePreviews)
				) {
					// Convert base64 previews to Files
					console.log(`📸 Q${idx}: Converting optionImagePreviews to Files`);
					filesToUpload = q.optionImagePreviews.map(
						(dataUrl: string, idx: number) => {
							if (!dataUrl || dataUrl === "") return null;
							try {
								return dataUrlToFile(dataUrl, `option-${idx}.png`);
							} catch (err) {
								console.error(`Failed to convert preview ${idx}:`, err);
								return null;
							}
						}
					);
				}

				// Validate option images before upload (only check non-null files)
				const nonNullFiles = filesToUpload.filter((f) => f !== null) as File[];
				if (nonNullFiles.length > 0) {
					try {
						validateOptionImages(filesToUpload);
						console.log(
							`📸 Q${idx}: Uploading ${nonNullFiles.length} option images out of ${filesToUpload.length} positions`
						);
						optionImages = await uploadOptionImages(filesToUpload, true);
						console.log(`📸 Q${idx}: Final optionImages URLs:`, optionImages);
					} catch (err) {
						console.error(
							`❌ Q${idx}: Option image validation/upload failed:`,
							err
						);
						optionImages = filesToUpload.map(() => "");
					}
				} else if (
					q.optionImages &&
					Array.isArray(q.optionImages) &&
					q.optionImages.length > 0
				) {
					// Use existing images from DB
					console.log(`📸 Q${idx}: Using existing optionImages from DB`);
					optionImages = q.optionImages;
				}

				console.log(`📸 Q${idx}: Final optionImages array:`, optionImages);

				const base: any = {
					...(q.id && { id: q.id }), // Include ID if exists (for updates)
					questionText: q.questionText,
					type: q.type,
					points,
					orderIndex: typeof q.orderIndex === "number" ? q.orderIndex : idx,
					// Only use uploaded imageUrl or existing DB path, never base64 data
					imageUrl:
						imageUrl ||
						(q.imageUrl && !q.imageUrl.startsWith("data:image/")
							? q.imageUrl
							: ""),
				};

				console.log(`📋 Processing Q${idx}:`, {
					id: q.id,
					type: q.type,
					hasId: !!q.id,
					hasOptionImages: optionImages.length > 0,
					optionImagesCount: optionImages.length,
				});

				if (q.type === "essay") {
					return {
						...base,
						options: [],
						correctAnswer: "",
						optionImages: [],
					};
				}

				if (q.type === "true_false") {
					return {
						...base,
						options: ["Benar", "Salah"],
						correctAnswer: String(q.correctAnswer ?? ""),
						optionImages: [],
					};
				}

				const optionsRaw = q.options || [];
				// DON'T filter options - keep all of them to preserve index mapping for correctAnswer
				// Just ensure optionImages array matches optionsRaw length by padding with ""
				const hasOptionImages = optionImages && optionImages.length > 0;

				// Ensure optionImages length matches optionsRaw length
				while (optionImages.length < optionsRaw.length) {
					optionImages.push("");
				}
				optionImages = optionImages.slice(0, optionsRaw.length);

				console.log(`📸 Q${idx}: Aligned optionImages to options:`, {
					optionsCount: optionsRaw.length,
					optionImagesCount: optionImages.length,
					optionImages: optionImages,
				});

				const filteredOptions = optionsRaw;

				if (q.type === "mixed_multiple_choice") {
					// Parse correctAnswer which should already be in index format like "0,1,3"
					// Since we're NOT filtering options, indices map directly to positions
					const corrStr = String(q.correctAnswer || "").trim();

					return {
						...base,
						options: filteredOptions,
						correctAnswer: corrStr, // Already in correct index format
						optionImages: optionImages, // Aligned with options array
					};
				}

				// For regular multiple_choice, convert correctAnswer to text or index
				let correctAnswer: any = q.correctAnswer;

				if (q.type === "multiple_choice") {
					if (typeof correctAnswer === "number") {
						// If numeric, convert to option text from filtered options
						if (correctAnswer >= 0 && correctAnswer < filteredOptions.length) {
							correctAnswer =
								filteredOptions[correctAnswer] || String(correctAnswer);
						}
					} else if (typeof correctAnswer === "string") {
						// If text, make sure it's in filteredOptions
						if (!filteredOptions.includes(correctAnswer)) {
							// Try to find a match (case-insensitive)
							const match = filteredOptions.find(
								(opt) => opt.toLowerCase() === correctAnswer.toLowerCase()
							);
							correctAnswer = match || correctAnswer;
						}
					}
				}

				return {
					...base,
					options: filteredOptions,
					correctAnswer: String(correctAnswer ?? ""),
					optionImages: optionImages,
				};
			})
		);

		console.log("📦 Processed questions to send:", processedQuestions);
		console.log("📦 Processed questions IDs:");
		processedQuestions.forEach((q: any, idx: number) => {
			console.log(
				`  Q${idx}: id=${q.id || "UNDEFINED"}, type=${
					q.type
				}, text="${q.questionText?.substring(0, 30)}"`
			);
		});
		console.log("📦 First question details:", {
			...(processedQuestions[0] && {
				id: processedQuestions[0].id,
				text: processedQuestions[0].questionText?.substring(0, 30),
				type: processedQuestions[0].type,
				optionImages: processedQuestions[0].optionImages,
				optionImagesLength: processedQuestions[0].optionImages?.length,
			}),
		});
		console.log(
			"📦 Final payload questions (first 2):",
			processedQuestions.slice(0, 2)
		);

		return processedQuestions;
	};

	const submitExam = async (
		examId?: number | string
	): Promise<void | boolean> => {
		// Handle both numeric ID and string endpoint
		let resolvedId: number | undefined;
		if (typeof examId === "string") {
			// Extract ID from endpoint like "/exams/40"
			const match = examId.match(/\/exams\/(\d+)/);
			resolvedId = match ? Number(match[1]) : undefined;
		} else {
			resolvedId = examId;
		}

		// CRITICAL: Log questions with IDs at the start of submission
		console.log("=== EXAM SUBMIT START ===");
		console.log("📋 Questions state at submitExam with ALL properties:");
		questions.forEach((q: any, idx: number) => {
			console.log(
				`  Q${idx}: id=${q.id}, type=${
					q.type
				}, hasOptions=${!!q.options}, text="${q.questionText?.substring(
					0,
					30
				)}"`
			);
		});

		console.log(
			"📝 State questions at submitExam (raw):",
			questions.map((q: any) => ({
				id: q.id,
				type: q.type,
				hasFiles: !!q.optionImageFiles,
			}))
		);

		console.log(
			"⚠️ CRITICAL: Verifying all questions have IDs OR none have IDs:"
		);
		const questionIds = questions.map((q: any) => q.id).filter((id) => id);
		const questionsWithoutIds = questions.filter((q: any) => !q.id);
		console.log(
			`  - Questions WITH id: ${questionIds.length}/${questions.length}`
		);
		console.log(
			`  - Questions WITHOUT id: ${questionsWithoutIds.length}/${questions.length}`
		);
		if (questionIds.length > 0 && questionsWithoutIds.length > 0) {
			console.warn(
				"⚠️ MIXED STATE: Some questions have IDs, some don't! This may cause duplication!"
			);
			questions.forEach((q: any, idx: number) => {
				console.log(
					`  Q${idx}: id=${
						q.id || "MISSING"
					} - This will be CREATED instead of UPDATED`
				);
			});
		}

		if (!validateForm()) {
			return false;
		}

		try {
			setLoading(true);

			// Process questions (upload images, filter options, etc)
			const processedQuestions = await processQuestions();

			// Helper function to convert local datetime to UTC ISO string
			// Indonesia is UTC+7, so we need to subtract 7 hours to get UTC
			const convertLocalToUTC = (dateTimeStr: string): string => {
				// Input: "2026-01-16T11:10" (local time from user - Indonesia UTC+7)
				// We need to convert this to UTC by subtracting 7 hours
				// So 11:10 local → 04:10 UTC → "2026-01-16T04:10:00.000Z"
				const [date, time] = dateTimeStr.split("T");
				const [hour, minute] = time.split(":").map(Number);

				// Create a local date object and get UTC equivalent
				const [year, month, day] = date.split("-").map(Number);
				const localDate = new Date(year, month - 1, day, hour, minute, 0);

				// Get UTC time in ISO format
				const utcHours = String(localDate.getUTCHours()).padStart(2, "0");
				const utcMinutes = String(localDate.getUTCMinutes()).padStart(2, "0");
				const utcDate = localDate.toISOString().split("T")[0];

				return `${utcDate}T${utcHours}:${utcMinutes}:00.000Z`;
			};

			// Prepare exam payload
			const examPayload: any = {
				...formData,
				// Convert local datetime to UTC format for backend
				startTime: convertLocalToUTC(formData.startTime),
				endTime: convertLocalToUTC(formData.endTime),
				questions: processedQuestions,
				totalScore: processedQuestions.reduce(
					(sum, q) => sum + (q.points || 0),
					0
				),
				totalQuestions: processedQuestions.length,
			};

			// Handle exam image upload if present
			if (examImageFile) {
				try {
					const compressed = await compressImageBrowser(
						examImageFile,
						1920,
						0.75
					);
					examPayload.imageUrl = await uploadImage(compressed.file);
				} catch (err) {
					console.error("Exam image compression failed:", err);
					examPayload.imageUrl = await uploadImage(examImageFile);
				}
			}

			// Convert ID fields to numbers
			if (examPayload.classId) {
				examPayload.classId = Number(examPayload.classId);
			}
			if (examPayload.semesterId) {
				examPayload.semesterId = Number(examPayload.semesterId);
			}
			if (examPayload.subjectId) {
				examPayload.subjectId = Number(examPayload.subjectId);
			}

			const gradeSelectionId = examPayload.gradeId;

			// Find matching grade if targetType is "grade"
			if (examPayload.targetType === "grade") {
				const selectedGrade = grades.find(
					(g) => g.id === Number(gradeSelectionId || 0)
				);
				if (selectedGrade) {
					examPayload.grade = `${selectedGrade.name} (${selectedGrade.section})`;
				}
				// Remove classId when targeting by grade (not by specific class)
				delete examPayload.classId;
			}

			if (examPayload.gradeId) {
				// gradeId is for filtering only, not sent to backend
				delete examPayload.gradeId;
			}

			console.log("📤 Sending payload to API:", {
				method: resolvedId ? "put" : "post",
				endpoint: resolvedId ? `/exams/${resolvedId}` : "/exams",
				totalQuestions: processedQuestions.length,
				firstQuestionHasOptionImages:
					processedQuestions[0]?.optionImages?.length > 0,
				firstQuestionOptionImagesLength:
					processedQuestions[0]?.optionImages?.length || 0,
			});

			// Debug: Log the actual payload being sent
			console.log("📦 Actual examPayload.questions[0]:", {
				questionText: examPayload.questions?.[0]?.questionText?.substring(
					0,
					30
				),
				type: examPayload.questions?.[0]?.type,
				hasOptionImages: !!examPayload.questions?.[0]?.optionImages,
				optionImages: examPayload.questions?.[0]?.optionImages,
			});

			// Make API call
			if (resolvedId) {
				await api.put(`/exams/${resolvedId}`, examPayload);
			} else {
				await api.post("/exams", examPayload);
			}

			toast.success("Ujian berhasil dibuat/diperbarui");
			return true;
		} catch (error: any) {
			console.error("Submit error:", error);
			toast.error(error.response?.data?.message || "Gagal menyimpan ujian");
			return false;
		} finally {
			setLoading(false);
		}
	};

	return { loading, submitExam };
}
