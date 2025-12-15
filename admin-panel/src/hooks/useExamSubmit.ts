import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Question, Grade } from "@/types/exam";
import { compressImageBrowser, formatFileSize } from "@/lib/imageCompression";

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

			const filledOptions = (q.options || []).filter((o) => o.trim());
			if (filledOptions.length < 2) {
				toast.error(`Soal ${i + 1}: Minimal 2 pilihan diisi`);
				return false;
			}
			if (!q.correctAnswer.trim()) {
				toast.error(`Soal ${i + 1}: Pilih jawaban benar`);
				return false;
			}
		}

		return true;
	};

	const uploadImage = async (file: File): Promise<string> => {
		const fd = new FormData();
		fd.append("file", file);
		const uploadRes = await api.post("/settings/upload", fd, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return uploadRes.data.path || uploadRes.data.url;
	};

	const processQuestions = async (): Promise<any[]> => {
		// Keep points as entered; do not normalize
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

				const base: any = {
					questionText: q.questionText,
					type: q.type,
					points,
					orderIndex: typeof q.orderIndex === "number" ? q.orderIndex : idx,
					imageUrl: imageUrl || q.imageUrl || "",
				};

				if (q.type === "essay") {
					return { ...base, options: [], correctAnswer: "" };
				}

				if (q.type === "true_false") {
					return {
						...base,
						options: ["Benar", "Salah"],
						correctAnswer: String(q.correctAnswer ?? ""),
					};
				}

				const optionsRaw = q.options || [];
				const filteredOptions = optionsRaw
					.map((o) => o.trim())
					.filter((o) => o !== "");

				if (q.type === "mixed_multiple_choice") {
					// Parse correctAnswer which may be in several formats:
					// - comma-separated numeric indices (0-based or 1-based)
					// - letters like A,B,C
					// - option texts
					const caRaw = String(q.correctAnswer || "").trim();
					const tokens = caRaw
						? caRaw
								.split(/[\s,;|\/]+/)
								.map((t) => t.trim())
								.filter(Boolean)
						: [];

					// Build mapping from original options array to filteredOptions indices
					const origToFiltered: Record<number, number> = {};
					const filtered: string[] = [];
					for (let i = 0, fi = 0; i < optionsRaw.length; i++) {
						const v = (optionsRaw[i] || "").trim();
						if (v !== "") {
							filtered.push(v);
							origToFiltered[i] = fi;
							fi++;
						}
					}

					let selectedFilteredIndexes: number[] = [];

					if (tokens.length > 0) {
						// Numeric tokens
						if (tokens.every((t) => /^\d+$/.test(t))) {
							let nums = tokens.map((t) => Number(t));
							// Heuristic: if any num > optionsRaw.length, assume 1-based and subtract 1
							if (nums.some((n) => n > optionsRaw.length)) {
								nums = nums.map((n) => n - 1);
							}
							// Map through origToFiltered
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
							// Token may be option text; match against filtered (normalized)
							const normalize = (s: string) =>
								(s || "").toString().replace(/\s+/g, " ").trim().toLowerCase();
							const lowerFiltered = filtered.map((f) => normalize(f));
							selectedFilteredIndexes = tokens
								.map((tok) => {
									// if token looks like 'A. text' remove leading letter and dot
									const cleaned = tok.replace(/^\s*[A-Za-z]\.\s*/, "").trim();
									const ni = normalize(cleaned);
									return lowerFiltered.indexOf(ni);
								})
								.filter((i) => i >= 0);
						}
					}

					// Deduplicate and keep valid indices
					selectedFilteredIndexes = Array.from(
						new Set(selectedFilteredIndexes)
					).filter((i) => i >= 0 && i < filtered.length);

					const mappedAnswers = selectedFilteredIndexes
						.map((fi) => filtered[fi])
						.filter(Boolean)
						.join(",");

					return {
						...base,
						options: filtered,
						correctAnswer: String(mappedAnswers || ""),
					};
				}

				const result = {
					...base,
					id: (q as any).id, // include existing id for updates
					options: filteredOptions,
					correctAnswer: String(q.correctAnswer || ""),
				};
				// processed question ready for submission
				return result;
			})
		);

		// All questions processed

		return processedQuestions;
	};

	const submitExam = async (
		endpoint: string,
		method: "post" | "put" = "post"
	): Promise<boolean> => {
		if (!validateForm()) return false;

		setLoading(true);
		try {
			// Upload exam image
			let examImageUrl = "";
			if (examImageFile) {
				examImageUrl = await uploadImage(examImageFile);
			}

			// Process questions
			const processedQuestions = await processQuestions();

			// Build payload
			const payload: any = {
				title: formData.title,
				description: formData.description,
				duration: formData.duration,
				startTime: new Date(formData.startTime).toISOString(),
				endTime: new Date(formData.endTime).toISOString(),
				semesterId: Number(formData.semesterId),
				targetType: formData.targetType,
				subjectId: formData.subjectId ? Number(formData.subjectId) : undefined,
				totalScore: processedQuestions.reduce(
					(sum, q) => sum + (q.points || 0),
					0
				),
				totalQuestions: processedQuestions.length,
				randomizeQuestions: formData.randomizeQuestions,
				showResultImmediately: formData.showResultImmediately,
				status: formData.status || "draft",
				imageUrl: examImageUrl || undefined,
				questions: processedQuestions,
			};

			if (formData.targetType === "class") {
				payload.classId = Number(formData.classId);
			} else {
				const selectedGrade = grades.find(
					(g) => g.id === Number(formData.gradeId)
				);
				if (selectedGrade) {
					payload.grade = selectedGrade.name;
					payload.classId = undefined;
				}
			}

			// Submit
			if (method === "post") {
				await api.post(endpoint, payload);
			} else {
				await api.put(endpoint, payload);
			}

			return true;
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menyimpan ujian");
			return false;
		} finally {
			setLoading(false);
		}
	};

	return { loading, submitExam };
}
