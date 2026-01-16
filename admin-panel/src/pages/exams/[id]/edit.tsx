import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import ExamForm from "@/components/exam/ExamForm";
import QuestionList from "@/components/exam/QuestionList";
import QuestionSummary from "@/components/exam/QuestionSummary";
import QuestionModal from "@/components/QuestionModal";
import { api } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { classesApi } from "@/lib/classesApi";
import { subjectsApi } from "@/lib/subjectsApi";
import { semestersApi } from "@/lib/semestersApi";
import { gradesApi } from "@/lib/gradesApi";
import { useAuthStore } from "@/store/authStore";
import { useExamSubmit } from "@/hooks/useExamSubmit";
import { getImageUrl } from "@/lib/imageUrl";
import { Exam, Question } from "@/types/exam";

export default function ExamEditPage() {
	const router = useRouter();
	const { id } = router.query;
	const { user } = useAuthStore();

	const [exam, setExam] = useState<Exam | null>(null);
	const [loading, setLoading] = useState(true);
	const [classes, setClasses] = useState<any[]>([]);
	const [subjects, setSubjects] = useState<any[]>([]);
	const [semesters, setSemesters] = useState<any[]>([]);
	const [grades, setGrades] = useState<any[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [examImageFile, setExamImageFile] = useState<File | null>(null);
	const [examImagePreview, setExamImagePreview] = useState<string>("");

	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [editingQuestionIndex, setEditingQuestionIndex] = useState<
		number | null
	>(null);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		duration: 60,
		startTime: "",
		endTime: "",
		classId: "",
		subjectId: "",
		semesterId: "",
		totalScore: 100,
		randomizeQuestions: false,
		showResultImmediately: false,
		requireToken: false,
		targetType: "class" as "class" | "grade",
		gradeId: "",
		status: "draft",
	});

	const { loading: saving, submitExam } = useExamSubmit({
		questions,
		grades,
		formData,
		examImageFile,
	});

	useEffect(() => {
		if (id) {
			fetchExam();
			fetchClasses();
			fetchSemesters();
			fetchGrades();
		}
	}, [id]);

	const fetchExam = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/exams/${id}`);
			const examData = response.data;
			console.log("📋 Exam Data:", examData);
			console.log("📝 Questions loaded:", examData.questions?.length || 0);
			console.log(
				"🔍 Questions loaded from API:",
				examData.questions?.map((q: any) => ({
					id: q.id,
					questionText: q.questionText?.substring(0, 50),
					type: q.type,
					correctAnswer: q.correctAnswer,
					optionImages: q.optionImages,
					hasOptionImages: !!(q.optionImages && q.optionImages.length > 0),
				}))
			);

			// Enhance questions with optionImagePreviews for option images from DB
			const enhancedQuestions =
				examData.questions?.map((q: any) => {
					const enhanced = { ...q };
					// Initialize optionImagePreviews for option images
					if (
						q.optionImages &&
						Array.isArray(q.optionImages) &&
						q.optionImages.length > 0
					) {
						const { getImageUrl } = require("@/lib/imageUrl");
						enhanced.optionImagePreviews = (q.optionImages || []).map(
							(imgPath: string) => {
								if (!imgPath) return "";
								try {
									return getImageUrl(imgPath);
								} catch (err) {
									console.warn("Failed to get image URL for:", imgPath);
									return "";
								}
							}
						);
						console.log(
							"📸 Generated optionImagePreviews for question",
							q.id,
							":",
							enhanced.optionImagePreviews
						);
					} else {
						enhanced.optionImagePreviews = ["", "", "", "", ""];
					}
					return enhanced;
				}) || [];

			setExam(examData);
			setQuestions(enhancedQuestions);

			// Parse grade ID
			let matchedGradeId = "";
			if (examData.targetType === "grade" && examData.grade) {
				try {
					const gradesData = await gradesApi.getAll();
					const matchedGrade = gradesData.find((g: any) => {
						const formatted = `${g.name} (${g.section})`;
						return (
							formatted === examData.grade ||
							g.name === examData.grade ||
							examData.grade.includes(g.name)
						);
					});
					if (matchedGrade) matchedGradeId = matchedGrade.id.toString();
				} catch (error) {
					console.error("Error matching grade:", error);
				}
			}

			// Helper to convert UTC ISO string to local datetime format for form
			const utcToLocalFormFormat = (isoString?: string): string => {
				if (!isoString) return "";
				try {
					// Parse ISO string (e.g., "2026-01-16T04:10:00.000Z")
					const utcDate = new Date(isoString);
					// Convert to local time
					const year = utcDate.getFullYear();
					const month = String(utcDate.getMonth() + 1).padStart(2, "0");
					const day = String(utcDate.getDate()).padStart(2, "0");
					const hours = String(utcDate.getHours()).padStart(2, "0");
					const minutes = String(utcDate.getMinutes()).padStart(2, "0");
					return `${year}-${month}-${day}T${hours}:${minutes}`;
				} catch (e) {
					return "";
				}
			};

			setFormData({
				title: examData.title,
				description: examData.description,
				duration: examData.duration,
				startTime: utcToLocalFormFormat(examData.startTime),
				endTime: utcToLocalFormFormat(examData.endTime),
				classId: examData.classId?.toString() || "",
				subjectId: examData.subjectId?.toString() || "",
				semesterId: examData.semesterId?.toString() || "",
				totalScore: examData.totalScore || 100,
				randomizeQuestions: examData.randomizeQuestions || false,
				showResultImmediately: examData.showResultImmediately || false,
				requireToken: examData.requireToken || false,
				targetType: (examData.targetType as "class" | "grade") || "class",
				gradeId: matchedGradeId,
				status: examData.status || "draft",
			});

			// Load existing exam image if available
			if (examData.imageUrl) {
				setExamImagePreview(getImageUrl(examData.imageUrl));
			}

			if (examData.semesterId) {
				// Load subjects and classes filtered by the exam's semester
				const subjectsData = await subjectsApi.getAll();
				setSubjects(subjectsData);

				try {
					const allClasses = await classesApi.getAll();
					let filteredClasses =
						user?.role === "teacher" && (user?.teachingClasses?.length || 0) > 0
							? allClasses.filter(
									(c: any) =>
										c.semesterId === examData.semesterId &&
										user?.teachingClasses?.some((tc: any) => tc.id === c.id)
							  )
							: allClasses.filter(
									(c: any) => c.semesterId === examData.semesterId
							  );

					// Ensure the exam's class is included so the select shows current value
					if (examData.classId) {
						const hasExamClass = filteredClasses.some(
							(c: any) => c.id === examData.classId
						);
						if (!hasExamClass) {
							const missing = allClasses.find(
								(c: any) => c.id === examData.classId
							);
							if (missing) filteredClasses = [missing, ...filteredClasses];
						}
					}

					setClasses(filteredClasses);
				} catch (err) {
					console.error("Failed to fetch classes for semester:", err);
				}
			}
		} catch (error) {
			toast.error("Gagal memuat detail ujian");
			console.error("❌ Error loading exam:", error);
			router.push("/exams");
		} finally {
			setLoading(false);
		}
	};

	const fetchClasses = async () => {
		try {
			const data = await classesApi.getAll();
			const filtered =
				user?.role === "teacher" && (user?.teachingClasses?.length || 0) > 0
					? data.filter((c) =>
							user?.teachingClasses?.some((tc: any) => tc.id === c.id)
					  )
					: data;
			setClasses(filtered);
		} catch (error) {
			console.error("Failed to fetch classes:", error);
		}
	};

	const fetchSemesters = async () => {
		try {
			const data = await semestersApi.getAll();
			setSemesters(data);
		} catch (error) {
			console.error("Failed to fetch semesters:", error);
		}
	};

	const fetchGrades = async () => {
		try {
			const data = await gradesApi.getAll();
			setGrades(data);
		} catch (error) {
			console.error("Failed to fetch grades:", error);
		}
	};

	const handleExamImageChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Ukuran file maksimal 5MB");
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("File harus berupa gambar");
			return;
		}

		try {
			const { compressImageBrowser, formatFileSize } = await import(
				"@/lib/imageCompression"
			);
			toast.loading("Kompres gambar...", { duration: 1000 });
			const compressed = await compressImageBrowser(file, 1920, 0.75);
			setExamImageFile(compressed.file);

			const reader = new FileReader();
			reader.onloadend = () => {
				setExamImagePreview(reader.result as string);
			};
			reader.readAsDataURL(compressed.file);

			toast.success(
				`Gambar dimuat (${formatFileSize(
					compressed.originalSize
				)} → ${formatFileSize(compressed.estimatedSize)})`
			);
		} catch (err) {
			setExamImageFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setExamImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
			toast.success(`Gambar dimuat`);
		}
	};

	const handleSaveExam = async (e: React.FormEvent) => {
		e.preventDefault();

		if (questions.length === 0) {
			toast.error("Tambahkan minimal 1 soal");
			return;
		}

		// Prevent double submission
		if (saving) {
			return;
		}

		const success = await submitExam(`/exams/${id}`);
		if (success) {
			toast.success("Ujian berhasil diperbarui");
			router.push(`/exams/${id}`);
		}
	};

	const handleAddQuestionFromModal = async (questionData: any) => {
		// Normalize correctAnswer into canonical index-based form when possible
		const normalizeCorrectAnswer = (q: any) => {
			const out: any = { ...q };
			out.options = Array.isArray(q.options)
				? q.options.map((o: any) => (o || "").toString())
				: [];

			if (q.type === "multiple_choice") {
				const ca = String(q.correctAnswer ?? "").trim();
				if (ca) {
					// IMPORTANT: Check if it's already a numeric index FIRST
					// before trying text matching, to avoid confusing
					// numeric option text (like "4") with indices
					if (/^\d+$/.test(ca)) {
						const num = Number(ca);
						if (num >= 0 && num < out.options.length) {
							out.correctAnswer = String(num);
						} else {
							out.correctAnswer = "";
						}
					} else {
						// Not numeric, try matching option text
						let idx = out.options.indexOf(ca);
						if (idx < 0) {
							const lower = ca.toLowerCase();
							idx = out.options.findIndex(
								(o: string) => (o || "").toLowerCase() === lower
							);
						}
						if (idx >= 0) {
							out.correctAnswer = String(idx);
						} else {
							out.correctAnswer = "";
						}
					}
				} else {
					out.correctAnswer = "";
				}
			} else if (q.type === "mixed_multiple_choice") {
				const ca = String(q.correctAnswer ?? "").trim();
				if (!ca) {
					out.correctAnswer = "";
				} else if (/^[\d,\s]+$/.test(ca)) {
					// already numeric list
					out.correctAnswer = ca
						.split(/\s*,\s*/)
						.map((s: string) => s.trim())
						.filter(Boolean)
						.join(",");
				} else {
					// try parse tokens and map to option indices
					let parts = ca
						.split(/[;,|\/]+|\s+/)
						.map((p) => p.trim())
						.filter(Boolean);
					const indices: number[] = [];
					for (const p of parts) {
						if (/^\d+$/.test(p)) {
							indices.push(Number(p));
							continue;
						}
						if (/^[A-Za-z]$/.test(p)) {
							indices.push(p.toUpperCase().charCodeAt(0) - 65);
							continue;
						}
						const lower = p.toLowerCase();
						const found = out.options.findIndex(
							(o: string) => (o || "").toLowerCase() === lower
						);
						if (found >= 0) indices.push(found);
					}
					out.correctAnswer = Array.from(
						new Set(indices.filter((n) => n >= 0 && n < out.options.length))
					).join(",");
				}
			}

			return out;
		};

		if (editingQuestionIndex !== null) {
			const updated = [...questions];
			const existingQuestion = updated[editingQuestionIndex];
			const normalized = normalizeCorrectAnswer(questionData);
			console.log("🔁 Editing question - incoming:", questionData);
			console.log(
				"🔁 Editing question - incoming.correctAnswer:",
				questionData.correctAnswer
			);
			console.log("🔁 Editing question - normalized:", normalized);
			console.log(
				"🔁 Editing question - normalized.correctAnswer:",
				normalized.correctAnswer
			);
			const normalizedOptionImages =
				normalized.optionImages !== undefined
					? normalized.optionImages
					: existingQuestion.optionImages;
			updated[editingQuestionIndex] = {
				...normalized,
				id: existingQuestion.id,
				orderIndex: editingQuestionIndex,
				optionImages: normalizedOptionImages,
				optionImageFiles: questionData.optionImageFiles,
				optionImagePreviews: questionData.optionImagePreviews,
			};
			setQuestions(updated);
			console.log(
				"🔁 Questions state after update (correctAnswers):",
				updated.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer }))
			);
			toast.success("Soal berhasil diperbarui");
		} else {
			const normalized = normalizeCorrectAnswer(questionData);
			console.log("➕ Adding question - incoming:", questionData);
			console.log("➕ Adding question - normalized:", normalized);
			const newQuestion = {
				...normalized,
				orderIndex: questions.length,
				optionImageFiles: questionData.optionImageFiles,
				optionImagePreviews: questionData.optionImagePreviews,
				optionImages: normalized.optionImages,
			};
			const next = [...questions, newQuestion];
			setQuestions(next);
			console.log("➕ Questions state after add:", next);
			toast.success("Soal berhasil ditambahkan");
		}
		setShowQuestionModal(false);
		setEditingQuestionIndex(null);
	};

	const handleEditQuestion = (index: number) => {
		setEditingQuestionIndex(index);
		setShowQuestionModal(true);
	};

	const handleDeleteQuestion = (index: number) => {
		setQuestions(questions.filter((_, i) => i !== index));
		toast.success("Soal berhasil dihapus");
	};

	if (loading) {
		return (
			<Layout title="Edit Ujian">
				<div className="card text-center py-12">
					<p className="text-gray-600">Memuat data ujian...</p>
				</div>
			</Layout>
		);
	}

	if (!exam) {
		return (
			<Layout title="Edit Ujian">
				<div className="card text-center py-12">
					<p className="text-gray-600 mb-4">Ujian tidak ditemukan</p>
					<Link href="/exams" className="btn btn-primary">
						Kembali ke Daftar Ujian
					</Link>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title={`Edit Ujian - ${exam.title}`}>
			<Head>
				<title>{`Edit Ujian - ${exam.title} - Admin Panel`}</title>
			</Head>
			<div className="max-w-5xl mx-auto px-2 sm:px-4">
				<div className="mb-6">
					<Link
						href={`/exams/${exam.id}`}
						className="text-blue-600 hover:text-blue-800"
					>
						← Kembali ke Detail
					</Link>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
						Edit Ujian
					</h1>
				</div>

				<form onSubmit={handleSaveExam} className="space-y-6">
					<ExamForm
						formData={formData}
						setFormData={setFormData}
						semesters={semesters}
						classes={classes}
						subjects={subjects}
						grades={grades}
						examImageFile={examImageFile}
						examImagePreview={examImagePreview}
						onExamImageChange={handleExamImageChange}
					/>{" "}
					<div className="grid grid-cols-3 gap-6">
						<div className="col-span-2">
							<QuestionList
								questions={questions}
								onEdit={handleEditQuestion}
								onDelete={handleDeleteQuestion}
							/>
						</div>

						<div>
							<QuestionSummary
								questions={questions}
								onAddQuestion={() => {
									setEditingQuestionIndex(null);
									setShowQuestionModal(true);
								}}
							/>
						</div>
					</div>
					{showQuestionModal && (
						<QuestionModal
							isOpen={showQuestionModal}
							onClose={() => {
								setShowQuestionModal(false);
								setEditingQuestionIndex(null);
							}}
							onSave={handleAddQuestionFromModal}
							initialData={
								editingQuestionIndex !== null
									? questions[editingQuestionIndex]
									: undefined
							}
							isEditing={editingQuestionIndex !== null}
						/>
					)}
					<div className="flex justify-end gap-3">
						<Link href={`/exams/${exam.id}`} className="btn btn-secondary">
							Batal
						</Link>
						<button type="submit" className="btn btn-primary" disabled={saving}>
							{saving ? "Menyimpan..." : "Simpan Perubahan"}
						</button>
					</div>
				</form>
			</div>
		</Layout>
	);
}
