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

		const startDate = new Date(formData.startTime);
		const endDate = new Date(formData.endTime);
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

				// Collect files to upload
				let filesToUpload: (File | null)[] = [];

				if (
					q.optionImageFiles &&
					Array.isArray(q.optionImageFiles) &&
					q.optionImageFiles.length > 0
				) {
					// Use uploaded files directly
					console.log(
						`📸 Q${idx}: Using optionImageFiles:`,
						q.optionImageFiles.length
					);
					filesToUpload = q.optionImageFiles;
				} else if (
					q.optionImagePreviews &&
					Array.isArray(q.optionImagePreviews)
				) {
					// Convert base64 previews to Files
					console.log(`📸 Q${idx}: Converting optionImagePreviews to Files`);
					filesToUpload = q.optionImagePreviews
						.map((dataUrl: string, idx: number) => {
							if (!dataUrl || dataUrl === "") return null;
							try {
								return dataUrlToFile(dataUrl, `option-${idx}.png`);
							} catch (err) {
								console.error(`Failed to convert preview ${idx}:`, err);
								return null;
							}
						})
						.filter((f) => f !== null);
				}

				// Validate option images before upload
				if (filesToUpload.length > 0) {
					try {
						validateOptionImages(filesToUpload);
						console.log(
							`📸 Q${idx}: Uploading ${filesToUpload.length} option images`
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

				// Initialize filteredOptionImages (will be updated for multiple choice below)
				let filteredOptionImages = Array.isArray(optionImages)
					? [...optionImages]
					: [];

				const base: any = {
					...(q.id && { id: q.id }), // Include ID if exists (for updates)
					questionText: q.questionText,
					type: q.type,
					points,
					orderIndex: typeof q.orderIndex === "number" ? q.orderIndex : idx,
					imageUrl: imageUrl || q.imageUrl || "",
				};

				console.log(`📋 Processing Q${idx}:`, {
					id: q.id,
					type: q.type,
					hasId: !!q.id,
					hasOptionImages: optionImages.length > 0,
					optionImagesCount: optionImages.length,
					filteredOptionImagesLength: filteredOptionImages.length,
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
				// Filter options: remove empty ones UNLESS they have a corresponding image
				const hasOptionImages = optionImages && optionImages.length > 0;
				const filteredOptions = optionsRaw
					.map((o, idx) => {
						const trimmed = o.trim();
						// Keep non-empty options always
						if (trimmed) return trimmed;
						// Keep empty options only if they have an image
						if (hasOptionImages && optionImages[idx]) {
							return ""; // Keep the empty placeholder
						}
						return null; // Mark for removal
					})
					.filter((o) => o !== null) as string[];

				// Also filter optionImages to match filteredOptions length
				if (filteredOptions.length !== optionImages.length) {
					console.log(
						`📸 Q${idx}: Filtering optionImages from ${optionImages.length} to ${filteredOptions.length}`
					);
					// Keep only images for options that weren't filtered out
					const imageKeepMap: boolean[] = optionsRaw.map((o, idx) => {
						const trimmed = o.trim();
						if (trimmed) return true; // Keep image for non-empty option
						if (hasOptionImages && optionImages[idx]) return true; // Keep image for photo-only option
						return false; // Remove image for filtered-out option
					});
					filteredOptionImages = optionImages.filter(
						(_, idx) => imageKeepMap[idx]
					);
					console.log(
						`📸 Q${idx}: Final filteredOptionImages:`,
						filteredOptionImages
					);
				}

				if (q.type === "mixed_multiple_choice") {
					// Parse correctAnswer which may be in several formats:
					// - "A,B,C" or "A; B; C" or similar delimited
					// - "0,1,2" (indices into options array)
					// - Pre-parsed array (shouldn't happen in UI, but handle it)

					let selectedFilteredIndexes: number[] = [];

					// Parse raw correctAnswer
					const correctRaw = (q.correctAnswer || "").toString().trim();
					const origToFiltered: Record<number, number | undefined> = {};
					// Build mapping from original indices to filtered indices
					// IMPORTANT: Don't skip empty options - they may have images and be part of correctAnswer
					for (let origIdx = 0; origIdx < optionsRaw.length; origIdx++) {
						const origOpt = optionsRaw[origIdx]?.trim() || "";
						// For non-empty options, find their position in filteredOptions
						// For empty options (photo-only), map directly if they exist in filtered
						if (origOpt) {
							// Non-empty option text: match in filteredOptions
							const filtPos = filteredOptions.indexOf(origOpt);
							if (filtPos >= 0) {
								origToFiltered[origIdx] = filtPos;
							}
						} else {
							// Empty option (photo-only): For MMC with photos, keep the index mapping
							// Since filteredOptions still has the option even if text is empty (if it has image)
							origToFiltered[origIdx] = origIdx; // Map to same index
						}
					}

					// Parse tokens from correctRaw
					const tokens = correctRaw
						.split(/[;,\|\/]/)
						.map((t: string) => t.trim())
						.filter((t: string) => t);

					if (tokens.length > 0) {
						// Try to identify format: numeric indices or letter indices or text options
						if (tokens.every((t) => /^\d+$/.test(t))) {
							// Numeric indices 0,1,2 -> map to filtered indices
							const nums = tokens.map((t) => Number(t));
							selectedFilteredIndexes = nums
								.map((orig) => origToFiltered[orig])
								.filter((i) => typeof i === "number");
						} else if (tokens.every((t) => /^[A-Za-z]$/.test(t))) {
							// Letter tokens A,B,C -> indices
							const nums = tokens.map(
								(t) => t.toUpperCase().charCodeAt(0) - 65
							);
							selectedFilteredIndexes = nums
								.map((orig) => origToFiltered[orig])
								.filter((i) => typeof i === "number");
						} else {
							// Text tokens: find matching options in filteredOptions
							selectedFilteredIndexes = tokens
								.map((token: string) => {
									const lowerToken = token.toLowerCase();
									return filteredOptions.findIndex(
										(opt) => opt.toLowerCase() === lowerToken
									);
								})
								.filter((idx: number) => idx >= 0);
						}
					}

					const corrStr =
						selectedFilteredIndexes.length > 0
							? selectedFilteredIndexes.join(",")
							: "";
					return {
						...base,
						options: filteredOptions,
						correctAnswer: corrStr,
						optionImages: filteredOptionImages,
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
					optionImages: filteredOptionImages,
				};
			})
		);

		console.log("📦 Processed questions to send:", processedQuestions);
		console.log("📦 First question details:", {
			...(processedQuestions[0] && {
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

		console.log(
			"📝 State questions at submitExam (raw):",
			questions.map((q: any) => ({
				id: q.id,
				type: q.type,
				hasFiles: !!q.optionImageFiles,
			}))
		);

		if (!validateForm()) {
			return false;
		}

		try {
			setLoading(true);

			// Process questions (upload images, filter options, etc)
			const processedQuestions = await processQuestions();

			// Prepare exam payload
			const examPayload: any = {
				...formData,
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
