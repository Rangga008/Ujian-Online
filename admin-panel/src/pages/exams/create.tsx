import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import ExamForm from "@/components/exam/ExamForm";
import QuestionList from "@/components/exam/QuestionList";
import QuestionSummary from "@/components/exam/QuestionSummary";
import QuestionModal from "@/components/QuestionModal";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi from "@/lib/semestersApi";
import classesApi from "@/lib/classesApi";
import gradesApi from "@/lib/gradesApi";
import { useAuthStore } from "@/store/authStore";
import { compressImageBrowser, formatFileSize } from "@/lib/imageCompression";
import { useExamSubmit } from "@/hooks/useExamSubmit";
import { Question, Semester, Class, Subject, Grade } from "@/types/exam";

export default function CreateExamPage() {
	const router = useRouter();
	const { user } = useAuthStore();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// State
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [grades, setGrades] = useState<Grade[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [examImageFile, setExamImageFile] = useState<File | null>(null);
	const [examImagePreview, setExamImagePreview] = useState<string>("");
	const [importingQuestions, setImportingQuestions] = useState(false);

	// Question Modal State
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [editingQuestionIndex, setEditingQuestionIndex] = useState<
		number | null
	>(null);

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
		status: "draft",
	});

	const { loading, submitExam } = useExamSubmit({
		questions,
		grades,
		formData,
		examImageFile,
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

		const success = await submitExam("/exams", "post");
		if (success) {
			toast.success("Ujian berhasil dibuat");
			router.push("/exams");
		}
	};

	// Helpers for import
	const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
		try {
			const arr = dataUrl.split(",");
			if (arr.length < 2) return null;
			const mimeMatch = arr[0].match(/:(.*?);/);
			const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
			const bstr = atob(arr[1]);
			let n = bstr.length;
			const u8arr = new Uint8Array(n);
			while (n--) {
				u8arr[n] = bstr.charCodeAt(n);
			}
			return new File([u8arr], filename, { type: mime });
		} catch (err) {
			console.error("Failed to convert dataUrl to File", err);
			return null;
		}
	};

	const parseMarkdownToQuestions = (markdown: string) => {
		const blocks = markdown
			.split(/\n-{3,}\n/)
			.map((b) => b.trim())
			.filter(Boolean);

		const nextQuestions: Question[] = [];

		blocks.forEach((block, blockIndex) => {
			const lines = block
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean);
			if (!lines.length) return;

			let type: Question["type"] | string = "multiple_choice";
			let points = 10;
			let correctAnswer = "";
			let questionText = "";
			let options: string[] = [];
			let imageDataUrl: string | undefined;

			lines.forEach((line) => {
				const lower = line.toLowerCase();
				if (lower.startsWith("type:")) {
					const raw = line.split(":").slice(1).join(":").trim().toLowerCase();
					if (
						raw === "mixed_multiple_choice" ||
						raw === "mixed" ||
						raw === "majemuk"
					) {
						type = "mixed_multiple_choice";
					} else if (raw === "true_false" || raw === "true/false") {
						type = "true_false";
					} else if (raw === "essay" || raw === "esai") {
						type = "essay";
					} else {
						type = "multiple_choice";
					}
					return;
				}

				if (lower.startsWith("points:")) {
					const val = parseInt(line.split(":").slice(1).join(":").trim(), 10);
					if (!Number.isNaN(val)) points = val;
					return;
				}

				if (lower.startsWith("correct:")) {
					correctAnswer = line.split(":").slice(1).join(":").trim();
					return;
				}

				if (lower.startsWith("question:")) {
					questionText = line.split(":").slice(1).join(":").trim();
					return;
				}

				// Image - support inline data URIs or http(s) links
				if (
					/^!\[[^\]]*\]\((data:[^)]+)\)/.test(line) ||
					/^!\[[^\]]*\]\((https?:[^)]+)\)/.test(line)
				) {
					const dataMatch = line.match(/!\[[^\]]*\]\((data:[^)]+)\)/);
					const urlMatch = line.match(/!\[[^\]]*\]\((https?:[^)]+)\)/);
					if (dataMatch?.[1]) {
						imageDataUrl = dataMatch[1];
						// flag as data URI (handled later)
					} else if (urlMatch?.[1]) {
						imageDataUrl = urlMatch[1];
					}
					return;
				}

				if (/^[A-E][\.)]/i.test(line)) {
					options.push(line.replace(/^[A-E][\.)]\s*/, "").trim());
					return;
				}

				questionText = questionText ? `${questionText}\n${line}` : line;
			});

			const mapCorrectAnswer = (
				value: string,
				currentType: Question["type"],
				opts: string[]
			) => {
				if (!value) return "";
				if (currentType === "multiple_choice") {
					const letter = value.trim().toUpperCase();
					if (/^[A-E]$/.test(letter) && opts.length) {
						const idx = letter.charCodeAt(0) - 65;
						return opts[idx] || value;
					}
					return value;
				}

				if (currentType === "mixed_multiple_choice") {
					const letters = value
						.split(/[,;]/)
						.map((v) => v.trim().toUpperCase())
						.filter(Boolean);
					const mapped = letters
						.map((ltr) => {
							if (/^[A-E]$/.test(ltr) && opts.length) {
								const idx = ltr.charCodeAt(0) - 65;
								return opts[idx];
							}
							return ltr;
						})
						.filter(Boolean);
					return mapped.join(",");
				}

				return value;
			};

			const resolvedType = ((): Question["type"] => {
				if (type === "mixed_multiple_choice") return "mixed_multiple_choice";
				if (type === "true_false") return "true_false";
				if (type === "essay") return "essay";
				return "multiple_choice";
			})();

			const resolvedOptions = (
				["essay", "true_false"] as Question["type"][]
			).includes(resolvedType)
				? []
				: options.length
				? options
				: ["", ""];

			const resolvedCorrect = (["essay"] as Question["type"][]).includes(
				resolvedType
			)
				? ""
				: resolvedType === "true_false"
				? correctAnswer === "Salah"
					? "Salah"
					: "Benar"
				: mapCorrectAnswer(correctAnswer, resolvedType, resolvedOptions);

			if (!questionText.trim()) return;

			nextQuestions.push({
				questionText: questionText.trim(),
				type: resolvedType,
				options: resolvedOptions,
				correctAnswer: resolvedCorrect,
				points: points > 0 ? points : 1,
				orderIndex: questions.length + nextQuestions.length,
				imageFile:
					imageDataUrl && imageDataUrl.startsWith("data:")
						? dataUrlToFile(
								imageDataUrl,
								`imported-${Date.now()}-${blockIndex}.png`
						  )
						: null,
				imageUrl:
					imageDataUrl && !imageDataUrl.startsWith("data:") ? imageDataUrl : "",
			});
		});

		return nextQuestions;
	};

	// Parse HTML produced by mammoth.convertToHtml to extract questions from Word tables
	const parseHtmlTablesToQuestions = (html: string): Question[] => {
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");
			const tables = Array.from(doc.querySelectorAll("table"));
			const parsed: Question[] = [];

			if (!tables.length) return parsed;

			tables.forEach((table, tableIndex) => {
				let type: Question["type"] = "multiple_choice";
				let points = 10;
				let questionText = "";
				let options: string[] = [];
				let correctAnswer = "";
				let imageSrc: string | undefined;

				const rows = Array.from(table.querySelectorAll("tr"));
				rows.forEach((tr) => {
					const cells = Array.from(tr.querySelectorAll("td, th"));
					if (!cells.length) return;
					const key = (cells[0].textContent || "").trim().toLowerCase();
					const valueCell = cells[1];
					const valueText = ((valueCell && valueCell.textContent) || "").trim();

					if (/type/i.test(key)) {
						const raw = valueText.toLowerCase();
						if (raw.includes("mixed") || raw.includes("majemuk"))
							type = "mixed_multiple_choice";
						else if (raw.includes("true")) type = "true_false";
						else if (raw.includes("essay") || raw.includes("esai"))
							type = "essay";
						else type = "multiple_choice";
						return;
					}

					if (/point|weight/i.test(key)) {
						const n = parseInt(valueText.replace(/[^0-9]/g, ""), 10);
						if (!Number.isNaN(n)) points = n;
						return;
					}

					if (/question/i.test(key)) {
						questionText = valueText;
						const img = valueCell.querySelector("img");
						if (img?.getAttribute("src"))
							imageSrc = img.getAttribute("src") || undefined;
						return;
					}

					if (/option|answer|answers|jawaban/i.test(key)) {
						const nestedTable = valueCell.querySelector("table");
						if (nestedTable) {
							const optRows = Array.from(nestedTable.querySelectorAll("tr"));
							optRows.forEach((or) => {
								const cols = Array.from(or.querySelectorAll("td, th"));
								if (!cols.length) return;
								// Prefer Answers column when table has 3 cols (# | Answers | Point)
								let raw = "";
								if (cols.length >= 3) raw = (cols[1].textContent || "").trim();
								else if (cols.length === 2)
									raw = (cols[1].textContent || "").trim();
								else raw = (cols[0].textContent || "").trim();
								if (!raw) return;
								// Split concatenated answers (A. OneB) Two) or tab-separated or newline-separated
								let parts: string[] = [];
								if (raw.includes("\t")) {
									parts = raw.split(/\t+/).map((s) => s.trim());
								} else if (/[A-E][\.\)]/.test(raw) && !/[\r\n]/.test(raw)) {
									parts = raw
										.split(/(?=[A-E][\.\)])/)
										.map((s) => s.trim())
										.filter(Boolean);
								} else {
									parts = raw
										.split(/\r?\n/)
										.map((s) => s.trim())
										.filter(Boolean);
								}
								parts.forEach((p) => {
									const m = p.match(/^[\s\dA-Ea-e\.\)\-:]+(.*)$/);
									const cleaned = m && m[1] ? m[1].trim() : p.trim();
									if (cleaned) options.push(cleaned);
								});
							});
						} else {
							// valueText might contain options separated by newlines or concatenated letter markers
							let lines = valueText
								.split(/\r?\n/)
								.map((l) => l.trim())
								.filter(Boolean);
							if (lines.length === 1 && /[A-E][\.\)]/.test(lines[0])) {
								lines = lines[0]
									.split(/(?=[A-E][\.\)])/)
									.map((s) => s.trim())
									.filter(Boolean);
							}
							lines.forEach((l) => {
								const cleaned = l.replace(/^[\s\dA-Ea-e\.\)\-:]+/, "").trim();
								if (cleaned) options.push(cleaned);
							});
						}
						const img = valueCell.querySelector("img");
						if (img?.getAttribute("src"))
							imageSrc = img.getAttribute("src") || undefined;
						return;
					}

					if (/correct/i.test(key)) {
						correctAnswer = valueText;
						return;
					}
				});

				// If correctAnswer contains multiple tokens (e.g. "A C", "A,C", "1 3"),
				// treat this as a mixed_multiple_choice even if Type cell says multiple_choice.
				const correctTokens = (correctAnswer || "")
					.toString()
					.trim()
					.split(/[;,\s]+/)
					.filter(Boolean);
				if (correctTokens.length > 1 && type === "multiple_choice") {
					type = "mixed_multiple_choice";
				}

				const resolvedOptions = (
					["essay", "true_false"] as Question["type"][]
				).includes(type)
					? []
					: options.length
					? options
					: ["", ""];
				let resolvedCorrect = "";
				if ((["true_false"] as Question["type"][]).includes(type))
					resolvedCorrect = correctAnswer.toLowerCase().includes("salah")
						? "Salah"
						: "Benar";
				else if (resolvedOptions.length) {
					const raw = (correctAnswer || "").toString().trim();
					// numeric index (1-based)
					if (/^\d+$/.test(raw)) {
						const idx = Number(raw) - 1;
						resolvedCorrect = resolvedOptions[idx] || correctAnswer;
					} else {
						const letter = raw.toUpperCase();
						if (/^[A-E]$/.test(letter)) {
							const idx = letter.charCodeAt(0) - 65;
							resolvedCorrect = resolvedOptions[idx] || correctAnswer;
						} else if (/[,;\s]+/.test(raw) && raw.match(/[A-E\d]/i)) {
							// multiple answers like "A,C" or "1,3"
							const parts = raw
								.split(/[,;\s]+/)
								.map((p: string) => p.trim())
								.filter(Boolean);
							const mapped = parts
								.map((p) => {
									if (/^\d+$/.test(p)) {
										const i = Number(p) - 1;
										return resolvedOptions[i];
									}
									if (/^[A-E]$/i.test(p)) {
										const i = p.toUpperCase().charCodeAt(0) - 65;
										return resolvedOptions[i];
									}
									return p;
								})
								.filter(Boolean);
							resolvedCorrect = mapped.join(",");
						} else {
							resolvedCorrect = correctAnswer;
						}
					}
				}

				// If any image exists anywhere inside this question table, prefer it
				const tableImg = table.querySelector("img");
				if (tableImg?.getAttribute("src")) {
					imageSrc = imageSrc || tableImg.getAttribute("src") || undefined;
				}

				parsed.push({
					questionText: questionText.trim(),
					type,
					options: resolvedOptions,
					correctAnswer: resolvedCorrect,
					points: points > 0 ? points : 1,
					orderIndex: questions.length + parsed.length,
					imageFile:
						imageSrc && imageSrc.startsWith("data:")
							? dataUrlToFile(
									imageSrc,
									`imported-${Date.now()}-${tableIndex}.png`
							  )
							: null,
					imageUrl: imageSrc && !imageSrc.startsWith("data:") ? imageSrc : "",
				});
			});

			return parsed;
		} catch (err) {
			console.error("parseHtmlTablesToQuestions failed", err);
			return [];
		}
	};

	const handleImportFromWord = async (file: File) => {
		setImportingQuestions(true);
		try {
			const mammoth: any = await import("mammoth/mammoth.browser");
			const buffer = await file.arrayBuffer();

			// First try to convert to HTML and parse tables (better for Word table templates)
			const htmlResult = await mammoth.convertToHtml(
				{ arrayBuffer: buffer },
				{
					convertImage: mammoth.images.inline(async (element: any) => {
						const base64 = await element.read("base64");
						return { src: `data:${element.contentType};base64,${base64}` };
					}),
				}
			);

			let parsed = parseHtmlTablesToQuestions(htmlResult.value || "");

			// If no tables found, fall back to markdown parser
			if (!parsed.length) {
				const mdResult = await mammoth.convertToMarkdown(
					{ arrayBuffer: buffer },
					{
						convertImage: mammoth.images.inline(async (element: any) => {
							const base64 = await element.read("base64");
							return { src: `data:${element.contentType};base64,${base64}` };
						}),
					}
				);
				parsed = parseMarkdownToQuestions(mdResult.value || "");
			}

			if (!parsed.length) {
				toast.error(
					"Template tidak terbaca. Pastikan format sesuai contoh dan dipisah '---' atau menggunakan tabel Word seperti template."
				);
				return;
			}

			setQuestions((prev) => {
				const merged = [...prev];
				parsed.forEach((p: Question, idx: number) => {
					merged.push({ ...p, orderIndex: merged.length + idx });
				});
				return merged;
			});
			toast.success(`Berhasil mengimpor ${parsed.length} soal`);
		} catch (error) {
			console.error("Import soal gagal", error);
			toast.error(
				"Gagal mengimpor soal. Gunakan file .docx sesuai template dan coba lagi."
			);
		} finally {
			setImportingQuestions(false);
		}
	};

	const handleImportInputChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (file) {
			await handleImportFromWord(file);
		}
		e.target.value = "";
	};

	const downloadTemplateDoc = async () => {
		try {
			// Prefer the pre-generated .docx in public/templates
			const resp = await fetch("/templates/template-import-soal.docx");
			if (resp.ok) {
				const blob = await resp.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "template-import-soal.docx";
				a.click();
				URL.revokeObjectURL(url);
				return;
			}

			// Fallback to raw .doc HTML template
			const resp2 = await fetch("/templates/template-import-soal.doc");
			if (!resp2.ok) throw new Error("Template not found");
			const blob2 = await resp2.blob();
			const url2 = URL.createObjectURL(blob2);
			const a2 = document.createElement("a");
			a2.href = url2;
			a2.download = "template-import-soal.doc";
			a2.click();
			URL.revokeObjectURL(url2);
		} catch (err) {
			console.error("Failed to download template", err);
			toast.error("Gagal mengunduh template");
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
								onImport={() => fileInputRef.current?.click()}
								onDownloadTemplate={downloadTemplateDoc}
								importing={importingQuestions}
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
						<button
							type="button"
							onClick={() => router.push("/exams")}
							className="btn btn-secondary"
						>
							Batal
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={loading}
						>
							{loading ? "Menyimpan..." : "Simpan Ujian"}
						</button>
					</div>
				</form>
			</div>
		</Layout>
	);
}
