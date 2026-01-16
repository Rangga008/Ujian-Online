import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { getImageUrl } from "@/lib/imageUrl";
import * as XLSX from "xlsx";

export default function ClassExamResultsPage() {
	const router = useRouter();
	const { classId, examId } = router.query;

	const [exam, setExam] = useState<any | null>(null);
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [classData, setClassData] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedSubmissionId, setSelectedSubmissionId] = useState<
		number | null
	>(null);
	const [selectedSubmission, setSelectedSubmission] = useState<any | null>(
		null
	);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answersState, setAnswersState] = useState<Record<number, number>>({});
	const [saving, setSaving] = useState(false);
	const [loadingSubmissionDetail, setLoadingSubmissionDetail] = useState(false);
	const [exporting, setExporting] = useState(false);

	// New states for search and grading filter
	const [searchQuery, setSearchQuery] = useState("");
	const [gradingFilter, setGradingFilter] = useState<
		"all" | "graded" | "pending"
	>("all");
	const [gradedSubmissions, setGradedSubmissions] = useState<Set<number>>(
		new Set()
	);
	const [lastExamVersionId, setLastExamVersionId] = useState<number | null>(
		null
	);

	// Function to reload submissions
	const reloadSubmissions = async () => {
		if (!examId) return;
		try {
			const submissionsResp = await api.get(`/submissions/exam/${examId}`);
			const allSubmissions = submissionsResp.data || [];
			const filtered = allSubmissions.filter((s: any) => {
				return String(s.student?.classId) === String(classId);
			});
			setSubmissions(filtered.length > 0 ? filtered : allSubmissions);
		} catch (err) {
			console.error("Error reloading submissions:", err);
		}
	};

	useEffect(() => {
		if (!classId || !examId) return;
		const load = async () => {
			setLoading(true);
			try {
				const [examResp, submissionsResp] = await Promise.all([
					api.get(`/exams/${examId}`),
					api.get(`/submissions/exam/${examId}`),
				]);
				setExam(examResp.data);
				setLastExamVersionId(examResp.data.id); // Track exam version
				const allSubmissions = submissionsResp.data || [];
				console.log("DEBUG - All submissions from API:", allSubmissions);
				console.log("DEBUG - Current classId:", classId);
				console.log("DEBUG - Submission structure:", allSubmissions[0]);

				const filtered = allSubmissions.filter((s: any) => {
					const submissionClassId = s.student?.classId;
					console.log(
						`DEBUG - Submission ${
							s.id
						}: student.classId=${submissionClassId}, matches=${
							String(submissionClassId) === String(classId)
						}`
					);
					return String(submissionClassId) === String(classId);
				});

				console.log(
					`DEBUG - Filtered submissions: ${filtered.length} out of ${allSubmissions.length}`
				);

				// Fallback: if no submissions filtered, show all (might be a filtering issue)
				if (filtered.length === 0 && allSubmissions.length > 0) {
					console.warn(
						"WARNING - No submissions matched the class filter. Showing all submissions instead."
					);
					setSubmissions(allSubmissions);
				} else {
					setSubmissions(filtered);
				}

				if (examResp.data.class) {
					setClassData(examResp.data.class);
				}
			} catch (err) {
				console.error(err);
				toast.error("Gagal memuat data ujian");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [classId, examId]);

	// Auto-reload submissions every 5 seconds to detect exam updates
	useEffect(() => {
		if (!examId || !classId) return;

		const interval = setInterval(async () => {
			try {
				const examResp = await api.get(`/exams/${examId}`);
				// Check if exam was updated (e.g., questions changed)
				if (lastExamVersionId !== null && examResp.data.updatedAt) {
					// Reload submissions if exam was modified
					await reloadSubmissions();
					console.log("✓ Submissions reloaded after exam update");
				}
			} catch (err) {
				console.error("Error polling exam updates:", err);
			}
		}, 5000); // Poll every 5 seconds

		return () => clearInterval(interval);
	}, [examId, classId, lastExamVersionId]);

	const totalQuestions = selectedSubmission?.answers?.length || 0;
	const currentQuestion =
		selectedSubmission?.answers?.[currentQuestionIndex] || null;
	const hasPrevQuestion = currentQuestionIndex > 0;
	const hasNextQuestion = currentQuestionIndex < totalQuestions - 1;

	const loadSubmissionAnswers = async (submissionId: number) => {
		setLoadingSubmissionDetail(true);
		try {
			const resp = await api.get(`/submissions/${submissionId}`);
			setSelectedSubmission(resp.data);
			const answerMap: Record<number, number> = {};
			(resp.data.answers || []).forEach((a: any) => {
				answerMap[a.id] = a.points ?? 0;
			});
			setAnswersState(answerMap);
			setCurrentQuestionIndex(0);
			console.log("DEBUG - Loaded submission answers:", resp.data.answers);
		} catch (err) {
			console.error(err);
			toast.error("Gagal memuat submission");
		} finally {
			setLoadingSubmissionDetail(false);
		}
	};

	const handleSelectSubmission = (submissionId: number) => {
		setSelectedSubmissionId(submissionId);
		loadSubmissionAnswers(submissionId);
	};

	// Helper function to resolve answer to display text/image
	const resolveAnswerDisplay = (answer: any) => {
		const question = answer.question;
		const rawAnswer = answer.answer;

		if (!question) return rawAnswer || "-";

		// For multiple choice with numeric index
		if (
			(question.type === "multiple_choice" ||
				question.type === "mixed_multiple_choice") &&
			/^\d+$/.test(rawAnswer)
		) {
			const idx = Number(rawAnswer);
			// If option images exist, return the image URL
			if (question.optionImages && question.optionImages[idx]) {
				return { type: "image", url: question.optionImages[idx] };
			}
			// Otherwise return option text
			const options = question.options || [];
			return { type: "text", value: options[idx] || rawAnswer || "-" };
		}

		// For mixed multiple choice with comma-separated indices
		if (
			question.type === "mixed_multiple_choice" &&
			/^[\d,\s]+$/.test(rawAnswer)
		) {
			const indices = rawAnswer.split(/[,\s]+/).map((s: string) => Number(s));
			const selectedOptions = indices
				.map((idx: number) => {
					if (question.optionImages && question.optionImages[idx]) {
						return { type: "image", url: question.optionImages[idx] };
					}
					const options = question.options || [];
					return { type: "text", value: options[idx] };
				})
				.filter((opt: any) => opt.value !== undefined || opt.url !== undefined);
			return { type: "mixed", items: selectedOptions };
		}

		return { type: "text", value: rawAnswer || "-" };
	};

	const handleDeleteSubmission = async () => {
		if (!selectedSubmissionId) return;
		if (!confirm("Hapus submission ini?")) return;
		try {
			await api.delete(`/submissions/${selectedSubmissionId}`);
			setSubmissions(submissions.filter((s) => s.id !== selectedSubmissionId));
			setSelectedSubmissionId(null);
			setSelectedSubmission(null);
			toast.success("Submission dihapus");
		} catch (err) {
			console.error(err);
			toast.error("Gagal menghapus submission");
		}
	};

	const handleToggleGraded = (submissionId: number) => {
		setGradedSubmissions((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(submissionId)) {
				newSet.delete(submissionId);
			} else {
				newSet.add(submissionId);
			}
			return newSet;
		});
	};

	// Filter submissions based on search and grading status
	const filteredSubmissions = submissions.filter((s) => {
		// Search filter by name or NIS
		const matchesSearch =
			searchQuery === "" ||
			(s.student?.name || "")
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			(s.student?.user?.nis || "").includes(searchQuery);

		// Grading status filter
		const isGraded = gradedSubmissions.has(s.id);
		let matchesGradingFilter = true;
		if (gradingFilter === "graded") {
			matchesGradingFilter = isGraded;
		} else if (gradingFilter === "pending") {
			matchesGradingFilter = !isGraded;
		}

		return matchesSearch && matchesGradingFilter;
	});

	const handleNextQuestion = () => {
		if (hasNextQuestion) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
		}
	};

	const handlePrevQuestion = () => {
		if (hasPrevQuestion) {
			setCurrentQuestionIndex(currentQuestionIndex - 1);
		}
	};

	const updatePoint = (answerId: number, value: number) => {
		setAnswersState((prev) => ({
			...prev,
			[answerId]: value,
		}));
	};

	const handleToggleCorrect = async (
		answerId: number,
		currentStatus: boolean
	) => {
		if (!selectedSubmission) return;
		setSaving(true);
		try {
			// Toggle the correct status by calling a new endpoint
			await api.patch(
				`/submissions/${selectedSubmission.id}/answer/${answerId}`,
				{
					isCorrect: !currentStatus,
				}
			);

			// Reload submission to reflect changes
			await loadSubmissionAnswers(selectedSubmission.id);
			toast.success(
				`Jawaban ditandai sebagai ${!currentStatus ? "benar" : "salah"}`
			);
		} catch (err) {
			console.error(err);
			toast.error("Gagal mengubah status jawaban");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveCurrentQuestion = async () => {
		if (!selectedSubmission || !examId || !currentQuestion) return;
		setSaving(true);
		try {
			// Only save if it's an essay question
			if (currentQuestion.question?.type !== "essay") {
				toast.error("Hanya soal essay yang bisa dinilai");
				setSaving(false);
				return;
			}

			const pointValue = answersState[currentQuestion.id] ?? 0;
			await api.post(`/submissions/${selectedSubmission.id}/grade`, {
				answers: [
					{
						id: currentQuestion.id,
						points: pointValue,
					},
				],
			});

			// Reload submission to reflect changes
			await loadSubmissionAnswers(selectedSubmission.id);
			toast.success("Nilai soal disimpan");
		} catch (err) {
			console.error(err);
			toast.error("Gagal menyimpan nilai");
		} finally {
			setSaving(false);
		}
	};

	const handleSave = async () => {
		if (!selectedSubmission || !examId) return;
		setSaving(true);
		try {
			const essayAnswers = (selectedSubmission.answers || [])
				.filter((a: any) => a.question?.type === "essay")
				.map((a: any) => ({
					id: a.id,
					points: answersState[a.id] ?? 0,
				}));

			if (essayAnswers.length === 0) {
				toast.error("Tidak ada soal essay untuk disimpan");
				setSaving(false);
				return;
			}

			await api.post(`/submissions/${selectedSubmission.id}/grade`, {
				answers: essayAnswers,
			});

			// Reload submission to reflect changes
			await loadSubmissionAnswers(selectedSubmission.id);
			toast.success("Semua nilai disimpan");
		} catch (err) {
			console.error(err);
			toast.error("Gagal menyimpan nilai");
		} finally {
			setSaving(false);
		}
	};

	const handleExportXLSX = async () => {
		if (!examId || submissions.length === 0) return;
		setExporting(true);
		try {
			// Fetch detailed submission data for each submission
			const detailsPromises = submissions.map((s) =>
				api.get(`/submissions/${s.id}`).then((r) => r.data)
			);
			const details = await Promise.all(detailsPromises);

			// Determine max number of questions across submissions
			let maxQuestions = 0;
			details.forEach((d: any) => {
				const cnt = (d.answers || []).length;
				if (cnt > maxQuestions) maxQuestions = cnt;
			});

			// Build headers
			const headers = ["Nama Siswa", "NIS"];
			for (let i = 1; i <= maxQuestions; i++) {
				headers.push(`Soal ${i}`);
			}
			headers.push("Total Nilai", "Total Maksimal", "Persentase (%)");

			// Build rows
			const rows: any[][] = [headers];

			for (const d of details) {
				const studentName = d.student?.name || "-";
				const nis = d.student?.user?.nis || "-";
				let maxScore = 0;
				let studentScore = 0;
				const answers = d.answers || [];

				answers.forEach((a: any) => {
					const qMax = Number(a.question?.points ?? 0);
					maxScore += qMax;
					studentScore += Number(a.points ?? 0);
				});

				const percent = maxScore > 0 ? (studentScore / maxScore) * 100 : 0;

				const row: any[] = [studentName, nis];

				// Add individual question scores
				for (let i = 0; i < maxQuestions; i++) {
					const ans = answers[i];
					if (ans) {
						const qScore = Number(ans.points ?? 0);
						row.push(qScore);
					} else {
						row.push("");
					}
				}

				// Add totals
				row.push(studentScore, maxScore, Number(percent.toFixed(2)));
				rows.push(row);
			}

			// Create worksheet
			const ws = XLSX.utils.aoa_to_sheet(rows);

			// Set column widths
			const colWidths = [20, 15]; // Nama Siswa, NIS
			for (let i = 0; i < maxQuestions; i++) {
				colWidths.push(12); // Soal scores
			}
			colWidths.push(15, 15, 15); // Total Nilai, Total Maksimal, Persentase
			ws["!cols"] = colWidths.map((w) => ({ wch: w }));

			// Create workbook
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");

			// Write and download
			XLSX.writeFile(wb, `hasil-ujian-${(exam && exam.title) || examId}.xlsx`);
			toast.success("Export selesai");
		} catch (err) {
			console.error(err);
			toast.error("Gagal mengekspor data");
		} finally {
			setExporting(false);
		}
	};

	if (loading) {
		return (
			<Layout title="Hasil Ujian">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Memuat...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Hasil Ujian">
			<Head>
				<title>Hasil Ujian - Per Siswa</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Hasil Ujian</h1>
						<div className="text-sm text-gray-600 mt-2">
							{exam ? exam.title : `Ujian ${examId}`}
						</div>
						{classData && (
							<div className="text-sm text-gray-600">
								{classData.name} - {classData.major}
							</div>
						)}
					</div>
					<div className="flex items-center space-x-2">
						<button
							onClick={() => reloadSubmissions()}
							className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
							title="Muat ulang submission"
						>
							🔄 Muat Ulang
						</button>
						<button
							onClick={() => handleExportXLSX()}
							disabled={exporting || submissions.length === 0}
							className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
						>
							{exporting ? "Mengekspor..." : "Export XLSX"}
						</button>
						<Link href={`/results/class/${classId}`} className="btn">
							← Kembali
						</Link>
					</div>
				</div>

				{/* Two Column Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left: Student List */}
					<div className="lg:col-span-1">
						<div className="card">
							<h2 className="text-lg font-bold mb-4">
								Daftar Siswa{" "}
								<span className="text-gray-600 font-normal text-sm">
									({filteredSubmissions.length})
								</span>
							</h2>

							{/* Search Box */}
							<div className="mb-4">
								<input
									type="text"
									placeholder="Cari nama atau NIS..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
								/>
							</div>

							{/* Filter Buttons */}
							<div className="mb-4 flex gap-2">
								<button
									onClick={() => setGradingFilter("all")}
									className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
										gradingFilter === "all"
											? "bg-blue-500 text-white"
											: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									Semua ({submissions.length})
								</button>
								<button
									onClick={() => setGradingFilter("pending")}
									className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
										gradingFilter === "pending"
											? "bg-yellow-500 text-white"
											: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									Pending (
									{
										submissions.filter((s) => !gradedSubmissions.has(s.id))
											.length
									}
									)
								</button>
								<button
									onClick={() => setGradingFilter("graded")}
									className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
										gradingFilter === "graded"
											? "bg-green-500 text-white"
											: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									Selesai ({gradedSubmissions.size})
								</button>
							</div>

							{filteredSubmissions.length === 0 ? (
								<p className="text-gray-600 text-center py-8">
									{submissions.length === 0
										? "Belum ada siswa yang mengerjakan."
										: "Tidak ada yang sesuai filter."}
								</p>
							) : (
								<div className="space-y-2 max-h-[550px] overflow-y-auto">
									{filteredSubmissions.map((s) => (
										<div key={s.id} className="flex items-start gap-2">
											<button
												onClick={() => handleSelectSubmission(s.id)}
												className={`flex-1 text-left p-3 rounded-lg border-2 transition ${
													selectedSubmissionId === s.id
														? "border-blue-500 bg-blue-50"
														: "border-gray-200 hover:border-gray-300"
												}`}
											>
												<div className="font-medium text-sm">
													{s.student?.name || "-"}
												</div>
												<div className="text-xs text-gray-600">
													NIS: {s.student?.user?.nis || "-"}
												</div>
												<div className="flex items-center justify-between mt-2">
													<span
														className={`text-xs px-2 py-1 rounded ${
															s.status === "submitted"
																? "bg-green-100 text-green-700"
																: "bg-blue-100 text-blue-700"
														}`}
													>
														{s.status}
													</span>
													<span className="font-bold text-sm text-primary-600">
														{s.score ?? "-"}
													</span>
												</div>
											</button>
											{/* Checkmark Button */}
											<button
												onClick={() => handleToggleGraded(s.id)}
												className={`mt-3 px-3 py-3 rounded-lg border-2 transition flex items-center justify-center ${
													gradedSubmissions.has(s.id)
														? "bg-green-100 border-green-500 text-green-600"
														: "bg-gray-100 border-gray-300 text-gray-400 hover:border-green-400"
												}`}
												title={
													gradedSubmissions.has(s.id)
														? "Sudah dinilai"
														: "Tandai selesai"
												}
											>
												<svg
													className="w-5 h-5"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Right: Submission Details with Question Navigation */}
					<div className="lg:col-span-2">
						{!selectedSubmission ? (
							<div className="card text-center py-12">
								{loadingSubmissionDetail ? (
									<p className="text-gray-600">Memuat submission...</p>
								) : (
									<p className="text-gray-600">
										Pilih siswa untuk melihat detail jawaban
									</p>
								)}
							</div>
						) : (
							<div className="space-y-4">
								{/* Header with Delete Button and Status */}
								<div className="card">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											<div className="flex items-center gap-3">
												<h2 className="text-2xl font-bold">
													{selectedSubmission.student?.name}
												</h2>
												{gradedSubmissions.has(selectedSubmissionId!) && (
													<div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
														<svg
															className="w-4 h-4"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clipRule="evenodd"
															/>
														</svg>
														Selesai
													</div>
												)}
											</div>
											<p className="text-gray-600 text-sm mt-2">
												NIS: {selectedSubmission.student?.user?.nis}
											</p>
											<p className="text-gray-600 text-sm mt-1">
												Status: {selectedSubmission.status} | Nilai:{" "}
												<span className="font-bold text-blue-600">
													{selectedSubmission.score ?? "-"}
												</span>
											</p>
										</div>
										<div className="flex flex-col gap-2">
											<button
												onClick={() =>
													handleToggleGraded(selectedSubmissionId!)
												}
												className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
													gradedSubmissions.has(selectedSubmissionId!)
														? "bg-green-100 text-green-700 hover:bg-green-200"
														: "bg-blue-100 text-blue-700 hover:bg-blue-200"
												}`}
											>
												<svg
													className="w-4 h-4"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clipRule="evenodd"
													/>
												</svg>
												{gradedSubmissions.has(selectedSubmissionId!)
													? "Tandai Belum Selesai"
													: "Tandai Selesai"}
											</button>
											<button
												onClick={handleDeleteSubmission}
												className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
											>
												Hapus
											</button>
										</div>
									</div>
								</div>

								{/* Question Display or Empty State */}
								{totalQuestions === 0 ? (
									<div className="card text-center py-12">
										<p className="text-gray-600">
											Tidak ada jawaban untuk submission ini
										</p>
									</div>
								) : (
									<div className="card">
										{/* Question Navigation Header */}
										<div className="flex items-center justify-between mb-6">
											<div className="font-medium">
												Soal {currentQuestionIndex + 1} dari {totalQuestions}
											</div>
											<div className="flex space-x-2">
												<button
													onClick={handlePrevQuestion}
													disabled={!hasPrevQuestion}
													className={`px-4 py-2 rounded-lg font-medium transition ${
														hasPrevQuestion
															? "bg-gray-200 hover:bg-gray-300"
															: "bg-gray-100 text-gray-400 cursor-not-allowed"
													}`}
												>
													← Sebelumnya
												</button>
												<button
													onClick={handleNextQuestion}
													disabled={!hasNextQuestion}
													className={`px-4 py-2 rounded-lg font-medium transition ${
														hasNextQuestion
															? "bg-gray-200 hover:bg-gray-300"
															: "bg-gray-100 text-gray-400 cursor-not-allowed"
													}`}
												>
													Berikutnya →
												</button>
											</div>
										</div>

										{/* Question Content */}
										{currentQuestion && (
											<div className="space-y-4 border-t pt-4">
												{/* Question Text */}
												<div>
													<h3 className="text-lg font-medium mb-2">
														{currentQuestion.question?.questionText}
													</h3>
													{currentQuestion.question?.imageUrl && (
														<img
															src={getImageUrl(
																currentQuestion.question.imageUrl
															)}
															alt="soal"
															className="max-w-md rounded mb-4"
														/>
													)}
												</div>

												{/* Question Type Badge */}
												<div className="flex space-x-2">
													{currentQuestion.question?.type === "essay" && (
														<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
															Essay
														</span>
													)}
													{(currentQuestion.question?.type ===
														"multiple_choice" ||
														currentQuestion.question?.type === "true_false" ||
														currentQuestion.question?.type ===
															"mixed_multiple_choice") && (
														<span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
															Pilihan Ganda
														</span>
													)}
												</div>

												{/* Answer Section - Essay or Multiple Choice */}
												{currentQuestion.question?.type === "essay" ? (
													<div>
														<label className="block text-sm font-medium mb-2">
															Jawaban Siswa:
														</label>
														<div className="p-3 bg-gray-50 rounded border mb-4 min-h-[100px] whitespace-pre-wrap">
															{currentQuestion.answerImageUrl ? (
																<img
																	src={getImageUrl(
																		currentQuestion.answerImageUrl
																	)}
																	alt="jawaban foto"
																	className="max-w-full max-h-80 rounded"
																/>
															) : (
																currentQuestion.answer || "-"
															)}
														</div>

														<div>
															<label className="block text-sm font-medium mb-2">
																Nilai (Points):
															</label>
															<div className="flex space-x-3 items-end">
																<input
																	type="number"
																	min={0}
																	max={currentQuestion.question?.points || 0}
																	className="input flex-1"
																	value={answersState[currentQuestion.id] ?? 0}
																	onChange={(e) =>
																		updatePoint(
																			currentQuestion.id,
																			Number(e.target.value)
																		)
																	}
																/>
																<span className="text-sm text-gray-600">
																	Max: {currentQuestion.question?.points}
																</span>
																<button
																	onClick={handleSaveCurrentQuestion}
																	disabled={saving}
																	className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
																>
																	{saving ? "Simpan..." : "Simpan"}
																</button>
															</div>
														</div>
													</div>
												) : (
													<div>
														<label className="block text-sm font-medium mb-2">
															Jawaban Siswa:
														</label>
														<div className="p-3 bg-gray-50 rounded border mb-3">
															{currentQuestion.answerImageUrl ? (
																<div>
																	<img
																		src={getImageUrl(
																			currentQuestion.answerImageUrl
																		)}
																		alt="jawaban foto"
																		className="max-w-full max-h-80 rounded mb-3"
																	/>
																	<div className="text-sm text-gray-600">
																		Jawaban dikirim sebagai foto
																	</div>
																</div>
															) : (
																<>
																	<div className="font-medium mb-2">
																		{(() => {
																			const display =
																				resolveAnswerDisplay(currentQuestion);
																			if (display.type === "image") {
																				return (
																					<img
																						src={getImageUrl(display.url)}
																						alt="pilihan foto"
																						className="max-w-xs max-h-64 rounded"
																					/>
																				);
																			} else if (display.type === "mixed") {
																				return (
																					<div className="space-y-2">
																						{display.items.map(
																							(item: any, idx: number) =>
																								item.type === "image" ? (
																									<div key={idx}>
																										<img
																											src={getImageUrl(
																												item.url
																											)}
																											alt={`pilihan ${idx + 1}`}
																											className="max-w-xs max-h-48 rounded"
																										/>
																									</div>
																								) : (
																									<div
																										key={idx}
																										className="px-2 py-1 bg-blue-100 rounded text-sm"
																									>
																										{item.value}
																									</div>
																								)
																						)}
																					</div>
																				);
																			}
																			return display.value || "-";
																		})()}
																	</div>
																	<div>
																		<span
																			className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition hover:opacity-80 ${
																				currentQuestion.isCorrect
																					? "bg-green-100 text-green-700"
																					: "bg-red-100 text-red-700"
																			}`}
																			onClick={() =>
																				handleToggleCorrect(
																					currentQuestion.id,
																					currentQuestion.isCorrect
																				)
																			}
																			title="Klik untuk mengubah status"
																		>
																			{currentQuestion.isCorrect
																				? "✓ Benar"
																				: "✗ Salah"}
																		</span>
																		<p className="text-xs text-gray-500 mt-1">
																			Klik untuk mengubah status
																		</p>
																	</div>
																</>
															)}
														</div>
														{!currentQuestion.answerImageUrl && (
															<div className="text-sm text-gray-600 mt-3 pt-3 border-t">
																<label className="block font-medium mb-2">
																	Jawaban Benar:
																</label>
																{(() => {
																	const display = resolveAnswerDisplay({
																		answer:
																			currentQuestion.question?.correctAnswer,
																		question: currentQuestion.question,
																	});
																	if (display.type === "image") {
																		return (
																			<div className="mb-2">
																				<img
																					src={getImageUrl(display.url)}
																					alt="jawaban benar"
																					className="max-w-xs max-h-48 rounded border border-green-200"
																				/>
																				<div className="text-xs text-green-600 mt-1">
																					Jawaban Benar (Foto)
																				</div>
																			</div>
																		);
																	} else if (display.type === "mixed") {
																		return (
																			<div className="space-y-1">
																				{display.items.map(
																					(item: any, idx: number) =>
																						item.type === "image" ? (
																							<div key={idx} className="mb-2">
																								<img
																									src={getImageUrl(item.url)}
																									alt={`jawaban benar ${
																										idx + 1
																									}`}
																									className="max-w-xs max-h-32 rounded border border-green-200"
																								/>
																							</div>
																						) : (
																							<div
																								key={idx}
																								className="px-2 py-1 bg-green-50 rounded text-sm text-green-700"
																							>
																								✓ {item.value}
																							</div>
																						)
																				)}
																			</div>
																		);
																	}
																	return (
																		<div className="px-2 py-1 bg-green-50 rounded text-green-700">
																			✓ {display.value || "-"}
																		</div>
																	);
																})()}
															</div>
														)}
													</div>
												)}
											</div>
										)}
									</div>
								)}

								{/* Save Button - Only show if there are essay questions */}
								{selectedSubmission?.answers?.some(
									(a: any) => a.question?.type === "essay"
								) && (
									<div className="flex space-x-2">
										<button
											onClick={handleSave}
											disabled={saving}
											className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? "Menyimpan..." : "Simpan Nilai"}
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
}
