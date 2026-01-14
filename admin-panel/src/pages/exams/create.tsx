import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import ExamForm from "@/components/exam/ExamForm";
import QuestionList from "@/components/exam/QuestionList";
import QuestionSummary from "@/components/exam/QuestionSummary";
import QuestionModal from "@/components/QuestionModal";
import TemplateModal from "@/components/exam/TemplateModal";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi from "@/lib/semestersApi";
import classesApi from "@/lib/classesApi";
import gradesApi from "@/lib/gradesApi";
import { useAuthStore } from "@/store/authStore";
import { useExamSubmit } from "@/hooks/useExamSubmit";
import { useQuestionImport } from "@/hooks/useQuestionImport";
import { useTemplateGenerator } from "@/hooks/useTemplateGenerator";
import { compressImageBrowser, formatFileSize } from "@/lib/imageCompression";
import { Question, Semester, Class, Subject, Grade } from "@/types/exam";

export default function CreateExamPage() {
	const router = useRouter();
	const { user } = useAuthStore();

	// State
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [grades, setGrades] = useState<Grade[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [examImageFile, setExamImageFile] = useState<File | null>(null);
	const [examImagePreview, setExamImagePreview] = useState<string>("");

	// Question Modal State
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [editingQuestionIndex, setEditingQuestionIndex] = useState<
		number | null
	>(null);

	// Template Config
	const [templateConfig, setTemplateConfig] = useState({
		multipleChoice: 5,
		mixedMultipleChoice: 2,
		trueFalse: 5,
		essay: 3,
	});
	const [showTemplateModal, setShowTemplateModal] = useState(false);

	// Form Data
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		duration: 60,
		startTime: "",
		endTime: "",
		semesterId: "",
		targetType: "class" as "class" | "grade",
		classId: "",
		gradeId: "",
		subjectId: "",
		randomizeQuestions: true,
		showResultImmediately: false,
		requireToken: false,
		status: "draft",
	});

	// Hooks
	const { loading, submitExam } = useExamSubmit({
		questions,
		grades,
		formData,
		examImageFile,
	});

	const { importing, triggerImport, handleImportInputChange, fileInputRef } =
		useQuestionImport({
			questions,
			setQuestions,
		});

	const { generating, handleGenerateTemplate } = useTemplateGenerator({
		templateConfig,
		setTemplateConfig,
		showTemplateModal,
		setShowTemplateModal,
	});

	useEffect(() => {
		fetchInitialData();
	}, []);

	useEffect(() => {
		if (formData.semesterId) {
			console.log("📚 Fetching classes for semester:", formData.semesterId);
			fetchClassesBySemester(Number(formData.semesterId));
		}
	}, [formData.semesterId]);

	const fetchInitialData = async () => {
		try {
			const [active, allSemesters, subjectsData, gradesData] =
				await Promise.all([
					semestersApi.getActive().catch(() => null),
					semestersApi.getAll(),
					api.get("/subjects").then((res) => res.data),
					gradesApi.getAll(),
				]);

			setActiveSemester(active);
			setSemesters(allSemesters);
			setSubjects(subjectsData);
			setGrades(gradesData);

			if (active) {
				setFormData((prev) => ({ ...prev, semesterId: String(active.id) }));
				await fetchClassesBySemester(active.id);
			}
		} catch (error) {
			toast.error("Gagal memuat data");
		}
	};

	const fetchClassesBySemester = async (semesterId: number) => {
		try {
			const allClasses = await classesApi.getAll();
			const filtered =
				user?.role === "teacher" && (user?.teachingClasses?.length || 0) > 0
					? allClasses.filter(
							(c) =>
								c.semesterId === semesterId &&
								user?.teachingClasses?.some((tc: any) => tc.id === c.id)
					  )
					: allClasses.filter((c) => c.semesterId === semesterId);
			setClasses(filtered);
		} catch (error) {
			toast.error("Gagal memuat data kelas");
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
			toast.success(`Gambar dimuat (${formatFileSize(file.size)})`);
		}
	};

	const handleAddQuestionFromModal = async (questionData: any) => {
		console.log("📌 handleAddQuestionFromModal received:", {
			questionText: questionData.questionText?.substring(0, 30),
			type: questionData.type,
			hasOptionImageFiles: !!questionData.optionImageFiles,
			optionImageFilesLength: questionData.optionImageFiles?.length,
			hasOptionImages: !!questionData.optionImages,
			optionImagesLength: questionData.optionImages?.length,
		});

		if (editingQuestionIndex !== null) {
			// Edit existing
			const updated = [...questions];
			updated[editingQuestionIndex] = questionData;
			setQuestions(updated);
			toast.success("Soal berhasil diperbarui");
		} else {
			// Add new
			setQuestions([...questions, questionData]);
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const success = await submitExam();
		if (success) {
			toast.success("Ujian berhasil dibuat");
			router.push("/exams");
		}
	};

	return (
		<Layout title="Buat Ujian">
			<Head>
				<title>Buat Ujian Baru - Admin Panel</title>
			</Head>
			<div className="max-w-5xl mx-auto px-2 sm:px-4">
				<div className="mb-6">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
						Buat Ujian Baru
					</h1>
					<p className="text-gray-600 mt-2">
						Isi informasi ujian dan tambahkan soal
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
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
					/>

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
								onImport={triggerImport}
								onDownloadTemplate={() => setShowTemplateModal(true)}
								importing={importing}
							/>
						</div>
					</div>

					<input
						type="file"
						accept=".doc,.docx"
						ref={fileInputRef}
						onChange={handleImportInputChange}
						className="hidden"
					/>
					{/* Submit Button */}
					<div className="flex gap-3 pt-6 border-t">
						<button
							type="button"
							onClick={() => router.push("/exams")}
							className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
						>
							Batal
						</button>
						<button
							type="submit"
							className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={questions.length === 0}
						>
							Simpan Ujian
						</button>
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

					{/* Template Modal Component */}
					<TemplateModal
						isOpen={showTemplateModal}
						onClose={() => setShowTemplateModal(false)}
						templateConfig={templateConfig}
						setTemplateConfig={setTemplateConfig}
						onGenerate={handleGenerateTemplate}
						generating={generating}
					/>
				</form>
			</div>
		</Layout>
	);
}
