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
				const allSubmissions = submissionsResp.data || [];
				const filtered = allSubmissions.filter(
					(s: any) => String(s.student?.classId) === String(classId)
				);
				setSubmissions(filtered);

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
			toast.success("Nilai disimpan");
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
									({submissions.length})
								</span>
							</h2>

							{submissions.length === 0 ? (
								<p className="text-gray-600 text-center py-8">
									Belum ada siswa yang mengerjakan.
								</p>
							) : (
								<div className="space-y-2 max-h-[600px] overflow-y-auto">
									{submissions.map((s) => (
										<button
											key={s.id}
											onClick={() => handleSelectSubmission(s.id)}
											className={`w-full text-left p-3 rounded-lg border-2 transition ${
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
								{/* Header with Delete Button */}
								<div className="card">
									<div className="flex items-start justify-between">
										<div>
											<h2 className="text-2xl font-bold">
												{selectedSubmission.student?.name}
											</h2>
											<p className="text-gray-600 text-sm mt-1">
												NIS: {selectedSubmission.student?.user?.nis}
											</p>
											<p className="text-gray-600 text-sm mt-1">
												Status: {selectedSubmission.status} | Nilai:{" "}
												<span className="font-bold text-blue-600">
													{selectedSubmission.score ?? "-"}
												</span>
											</p>
										</div>
										<button
											onClick={handleDeleteSubmission}
											className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
										>
											Hapus
										</button>
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
															{currentQuestion.answer &&
															currentQuestion.answer.startsWith("data:") ? (
																<img
																	src={currentQuestion.answer}
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
															</div>
														</div>
													</div>
												) : (
													<div>
														<label className="block text-sm font-medium mb-2">
															Jawaban Siswa:
														</label>
														<div className="p-3 bg-gray-50 rounded border mb-3">
															{currentQuestion.answer &&
															currentQuestion.answer.startsWith("data:") ? (
																<div>
																	<img
																		src={currentQuestion.answer}
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
																		{currentQuestion.answer || "-"}
																	</div>
																	<div>
																		<span
																			className={`px-3 py-1 rounded-full text-sm font-medium ${
																				currentQuestion.isCorrect
																					? "bg-green-100 text-green-700"
																					: "bg-red-100 text-red-700"
																			}`}
																		>
																			{currentQuestion.isCorrect
																				? "✓ Benar"
																				: "✗ Salah"}
																		</span>
																	</div>
																</>
															)}
														</div>
														{!currentQuestion.answer?.startsWith("data:") && (
															<div className="text-sm text-gray-600">
																Jawaban Benar:{" "}
																<span className="font-medium">
																	{(() => {
																		const ca =
																			currentQuestion.question?.correctAnswer ??
																			"";
																		const opts =
																			currentQuestion.question?.options || [];
																		const norm = (s: any) =>
																			(s || "").toString().trim();
																		if (
																			currentQuestion.question?.type ===
																			"mixed_multiple_choice"
																		) {
																			let parts = ca
																				.split(/[;,|\/\s]+/)
																				.map((p: string) => p.trim())
																				.filter(Boolean);
																			const mapped = parts.map((p: string) => {
																				if (/^\d+$/.test(p) && opts[Number(p)])
																					return norm(opts[Number(p)]);
																				if (/^[A-Za-z]$/.test(p)) {
																					const i =
																						p.toUpperCase().charCodeAt(0) - 65;
																					if (opts[i]) return norm(opts[i]);
																				}
																				return p;
																			});
																			return mapped.join(", ");
																		}
																		if (/^\d+$/.test(ca) && opts[Number(ca)])
																			return norm(opts[Number(ca)]);
																		if (/^[A-Za-z]$/.test(ca)) {
																			const i =
																				ca.toUpperCase().charCodeAt(0) - 65;
																			if (opts[i]) return norm(opts[i]);
																		}
																		return ca;
																	})()}
																</span>
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
