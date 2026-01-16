import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getImageUrl } from "@/lib/imageUrl";
import ConfirmationModal from "@/components/ConfirmationModal";

interface Question {
	id: number;
	questionText: string;
	type: string;
	points: number;
	options?: string[];
	correctAnswer?: string;
	imageUrl?: string;
	orderIndex: number;
	optionImages?: string[];
	optionImagePreviews?: string[];
	allowPhotoAnswer?: boolean;
}

interface Exam {
	id: number;
	title: string;
	description: string;
	status: string;
	duration: number;
	startTime: string;
	endTime: string;
	totalQuestions: number;
	totalScore: number;
	randomizeQuestions: boolean;
	showResultImmediately: boolean;
	token?: string;
	requireToken: boolean;
	class?: { id: number; name: string };
	targetType?: string;
	grade?: string;
	subject?: { id: number; name: string };
	semester?: { id: number; name: string; year: string };
	questions: Question[];
}

const QuestionTypeLabels: Record<string, string> = {
	multiple_choice: "Pilihan Ganda",
	mixed_multiple_choice: "Pilihan Ganda Majemuk",
	true_false: "Benar/Salah",
	essay: "Essay",
};

export default function ExamDetailPage() {
	const router = useRouter();
	const { id } = router.query;
	const [exam, setExam] = useState<Exam | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
	const [generatingToken, setGeneratingToken] = useState(false);
	const [statusLoading, setStatusLoading] = useState(false);

	// Modal states for confirmations
	const [deleteModal, setDeleteModal] = useState(false);
	const [statusModal, setStatusModal] = useState<{
		isOpen: boolean;
		action: string | null;
		title: string;
		message: string;
	}>({ isOpen: false, action: null, title: "", message: "" });

	useEffect(() => {
		if (id) {
			fetchExam();
		}
	}, [id]);

	const fetchExam = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/exams/${id}`);
			setExam(response.data);
		} catch (error) {
			toast.error("Gagal memuat detail ujian");
			router.push("/exams");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		try {
			await api.delete(`/exams/${id}`);
			toast.success("Ujian berhasil dihapus");
			router.push("/exams");
		} catch (error) {
			toast.error("Gagal menghapus ujian");
		}
	};

	const openDeleteModal = () => {
		setDeleteModal(true);
	};

	const handleStatusChangeRequest = (newStatus: string) => {
		const statusMessages: Record<string, { title: string; message: string }> = {
			published: {
				title: "Publish Ujian?",
				message:
					"Yakin ingin mempublish ujian ini? Ujian akan dapat diakses oleh siswa.",
			},
			ongoing: {
				title: "Mulai Ujian Sekarang?",
				message:
					"Yakin ingin memulai ujian ini sekarang? Waktu akan mulai dihitung untuk siswa.",
			},
			draft: {
				title: "Kembali ke Draft?",
				message:
					"Yakin ingin mengembalikan ujian ke draft? Akses ujian akan ditutup untuk siswa.",
			},
			closed: {
				title: "Tutup Ujian?",
				message:
					"Yakin ingin menutup ujian ini? Siswa tidak bisa lagi mengerjakan.",
			},
		};

		const config = statusMessages[newStatus];
		if (config) {
			setStatusModal({
				isOpen: true,
				action: newStatus,
				title: config.title,
				message: config.message,
			});
		}
	};

	const handleGenerateToken = async () => {
		try {
			setGeneratingToken(true);
			await api.post(`/exams/${id}/generate-token`);
			// Refetch exam dari DB untuk get token yang baru
			await fetchExam();
			toast.success("Token berhasil dibuat!");
		} catch (error) {
			toast.error("Gagal membuat token");
		} finally {
			setGeneratingToken(false);
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		try {
			setStatusLoading(true);
			await api.patch(`/exams/${id}`, {
				status: newStatus,
			});
			setExam({ ...exam!, status: newStatus });

			const statusMessages: Record<string, string> = {
				draft: "Ujian dikembalikan ke draft",
				published: "Ujian berhasil dipublish",
				ongoing: "Ujian dimulai",
				closed: "Ujian ditutup",
			};

			toast.success(statusMessages[newStatus] || "Status berhasil diubah");
			setStatusModal({ isOpen: false, action: null, title: "", message: "" });
		} catch (err: any) {
			console.error("Failed to change status:", err);
			const msg = err?.response?.data?.message || "Gagal mengubah status ujian";
			toast.error(msg);
		} finally {
			setStatusLoading(false);
		}
	};

	const getStatusBadge = (status: string) => {
		const colors = {
			draft: "bg-gray-100 text-gray-800",
			published: "bg-green-100 text-green-800",
			ongoing: "bg-blue-100 text-blue-800",
			closed: "bg-red-100 text-red-800",
		};
		return colors[status as keyof typeof colors] || colors.draft;
	};

	if (loading) {
		return (
			<Layout title="Detail Ujian">
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	if (!exam) {
		return (
			<Layout title="Detail Ujian">
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
		<Layout title={`Detail Ujian - ${exam.title}`}>
			<Head>
				<title>{`Detail Ujian - ${exam.title} - Admin Panel`}</title>
			</Head>
			<div className="px-2 sm:px-0">
				<div className="mb-6">
					<Link href="/exams" className="text-blue-600 hover:text-blue-800">
						← Kembali ke Daftar Ujian
					</Link>
				</div>

				{/* Header */}
				<div className="card mb-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-2">
								<h1 className="text-3xl font-bold text-gray-900">
									{exam.title}
								</h1>
								<span
									className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
										exam.status
									)}`}
								>
									{exam.status}
								</span>
							</div>
							<p className="text-gray-600 mb-4">{exam.description}</p>
						</div>
						<div className="flex gap-2 flex-shrink-0 flex-wrap">
							<Link href={`/exams/${exam.id}/edit`} className="btn btn-primary">
								Edit
							</Link>

							{/* Status Management Buttons */}
							{exam.status === "draft" && (
								<button
									onClick={() => {
										if (!confirm("Yakin ingin mempublish ujian ini?")) return;
										handleStatusChange("published");
									}}
									disabled={statusLoading}
									className="btn btn-success disabled:opacity-50"
								>
									{statusLoading ? "..." : "Publish"}
								</button>
							)}

							{exam.status === "published" && (
								<>
									<button
										onClick={() => {
											if (!confirm("Yakin ingin memulai ujian ini sekarang?"))
												return;
											handleStatusChange("ongoing");
										}}
										disabled={statusLoading}
										className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
									>
										{statusLoading ? "..." : "Mulai Sekarang"}
									</button>
									<button
										onClick={() => {
											if (!confirm("Yakin ingin mengembalikan ke draft?"))
												return;
											handleStatusChange("draft");
										}}
										disabled={statusLoading}
										className="btn btn-secondary disabled:opacity-50"
									>
										{statusLoading ? "..." : "Kembali ke Draft"}
									</button>
								</>
							)}

							{exam.status === "ongoing" && (
								<>
									<button
										onClick={() => {
											if (!confirm("Yakin ingin menutup ujian ini?")) return;
											handleStatusChange("closed");
										}}
										disabled={statusLoading}
										className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
									>
										{statusLoading ? "..." : "Tutup Ujian"}
									</button>
									<button
										onClick={() => {
											if (!confirm("Yakin ingin mengembalikan ke published?"))
												return;
											handleStatusChange("published");
										}}
										disabled={statusLoading}
										className="btn btn-secondary disabled:opacity-50"
									>
										{statusLoading ? "..." : "Kembali ke Published"}
									</button>
								</>
							)}

							{exam.status === "closed" && (
								<button
									onClick={() => {
										if (!confirm("Yakin ingin membuka kembali ujian ini?"))
											return;
										handleStatusChange("published");
									}}
									disabled={statusLoading}
									className="btn bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
								>
									{statusLoading ? "..." : "Buka Kembali"}
								</button>
							)}

							<button onClick={handleDelete} className="btn btn-danger">
								Hapus
							</button>
						</div>
					</div>

					{/* Exam Info Grid */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mb-4">
						<div>
							<p className="text-gray-600 text-sm">Durasi</p>
							<p className="text-lg font-semibold">⏱️ {exam.duration} menit</p>
						</div>
						<div>
							<p className="text-gray-600 text-sm">Total Soal</p>
							<p className="text-lg font-semibold">📝 {exam.totalQuestions}</p>
						</div>
						<div>
							<p className="text-gray-600 text-sm">Total Skor</p>
							<p className="text-lg font-semibold">🎯 {exam.totalScore}</p>
						</div>
						<div>
							<p className="text-gray-600 text-sm">Mulai</p>
							<p className="text-lg font-semibold">
								{format(new Date(exam.startTime), "dd MMM yyyy HH:mm", {
									locale: localeId,
								})}
							</p>
						</div>
						{exam.targetType === "grade" ? (
							<div>
								<p className="text-gray-600 text-sm">Angkatan</p>
								<p className="text-lg font-semibold">
									{(() => {
										const num = exam.grade?.toString().match(/\d+/)?.[0];
										return num ? `Angkatan ${num}` : `Angkatan ${exam.grade}`;
									})()}
								</p>
							</div>
						) : (
							exam.class && (
								<div>
									<p className="text-gray-600 text-sm">Kelas</p>
									<p className="text-lg font-semibold">{exam.class.name}</p>
								</div>
							)
						)}
						{exam.subject && (
							<div>
								<p className="text-gray-600 text-sm">Mata Pelajaran</p>
								<p className="text-lg font-semibold">{exam.subject.name}</p>
							</div>
						)}
						{exam.semester && (
							<div>
								<p className="text-gray-600 text-sm">Semester</p>
								<p className="text-lg font-semibold">{exam.semester.name}</p>
							</div>
						)}
						<div>
							<p className="text-gray-600 text-sm">Opsi</p>
							<div className="text-sm space-y-1">
								<p>
									{exam.randomizeQuestions ? "✓ Acak Soal" : "✗ Soal Terurut"}
								</p>
								<p>
									{exam.showResultImmediately
										? "✓ Tampil Hasil Langsung"
										: "✗ Hasil Tertunda"}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Token Section - Only show when requireToken is true */}
				{exam.requireToken && (
					<div className="card mb-6">
						<div className="flex items-center justify-between">
							<div className="flex-1">
								<h3 className="font-semibold text-blue-900 mb-1 text-lg">
									🔐 Token Ujian
								</h3>
								<p className="text-sm text-blue-700">
									Token diperlukan untuk mengakses ujian ini
								</p>
								{exam.token && (
									<div className="mt-3 p-3 bg-white rounded border border-blue-300">
										<p className="text-xs text-gray-600">Token Aktif:</p>
										<p className="text-lg font-mono font-bold text-blue-600 mt-1">
											{exam.token}
										</p>
										<button
											onClick={() => {
												navigator.clipboard.writeText(exam.token!);
												toast.success("Token disalin!");
											}}
											className="text-xs text-blue-600 hover:underline mt-2"
										>
											📋 Salin
										</button>
									</div>
								)}
							</div>
							<button
								onClick={handleGenerateToken}
								disabled={generatingToken}
								className={`px-4 py-2 rounded-lg font-medium text-sm flex-shrink-0 ${
									generatingToken
										? "bg-gray-300 text-gray-600 cursor-not-allowed"
										: "bg-blue-600 text-white hover:bg-blue-700"
								}`}
							>
								{generatingToken
									? "Membuat..."
									: exam.token
									? "Regenerate Token"
									: "Buat Token"}
							</button>
						</div>
					</div>
				)}

				{/* Questions Section */}
				<div className="card">
					<div className="flex items-center justify-between mb-6 pb-4 border-b">
						<h2 className="text-2xl font-bold text-gray-900">
							Daftar Soal ({exam.questions.length})
						</h2>
						<Link href={`/exams/${exam.id}/edit`} className="btn btn-primary">
							+ Tambah Soal
						</Link>
					</div>

					{exam.questions.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-600 mb-4">
								Belum ada soal dalam ujian ini
							</p>
							<Link href={`/exams/${exam.id}/edit`} className="btn btn-primary">
								Tambah Soal Pertama
							</Link>
						</div>
					) : (
						<div className="space-y-4">
							{exam.questions.map((question, idx) => (
								<div
									key={question.id}
									className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
								>
									<button
										onClick={() =>
											setExpandedQuestion(
												expandedQuestion === question.id ? null : question.id
											)
										}
										className="w-full flex items-start justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
									>
										<div className="flex-1 text-left">
											<div className="flex items-start gap-4">
												<span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full flex-shrink-0 h-fit">
													#{idx + 1}
												</span>
												<div className="flex-1">
													<p className="font-medium text-gray-900 line-clamp-2">
														{question.questionText}
													</p>
													<div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
														<span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
															{QuestionTypeLabels[question.type] ||
																question.type}
														</span>
														<span>Nilai: {question.points}</span>
													</div>
												</div>
											</div>
										</div>
										<div className="text-gray-400 flex-shrink-0 ml-4">
											{expandedQuestion === question.id ? "▼" : "▶"}
										</div>
									</button>

									{/* Expanded Question Details */}
									{expandedQuestion === question.id && (
										<div className="p-4 bg-white border-t">
											{question.imageUrl && (
												<div className="mb-4">
													<img
														src={getImageUrl(question.imageUrl)}
														alt="Gambar soal"
														className="max-w-md max-h-96 object-contain rounded border"
													/>
												</div>
											)}

											{question.type === "essay" ? (
												<div className="bg-gray-50 p-3 rounded">
													<p className="text-sm text-gray-600">
														Tipe: Essay (Jawaban Terbuka)
													</p>
												</div>
											) : (
												<div className="space-y-3">
													<div>
														<p className="text-sm font-medium text-gray-700 mb-2">
															Pilihan Jawaban:
														</p>
														<div className="space-y-2">
															{question.options?.map((option, idx) => {
																// Robust detection for mixed multiple choice correct answers.
																let isCorrect = false;
																const normalize = (s: any) =>
																	(s || "").toString().trim();
																if (question.type === "mixed_multiple_choice") {
																	const caRaw = normalize(
																		question.correctAnswer
																	);
																	if (!caRaw) {
																		isCorrect = false;
																	} else {
																		// Try many formats: indices "0,2", letters "A,C", texts "opt1,opt2"
																		const parts = caRaw
																			.split(/[,;|\/]+/)
																			.map((p: string) => p.trim())
																			.filter(Boolean);
																		// If all parts are numeric -> treat as indices
																		if (
																			parts.length > 0 &&
																			parts.every((p: string) =>
																				/^\d+$/.test(p)
																			)
																		) {
																			const idxs = parts.map((p: string) =>
																				Number(p)
																			);
																			isCorrect = idxs.includes(idx);
																		} else if (
																			parts.length > 0 &&
																			parts.every((p: string) =>
																				/^[A-Za-z]$/.test(p)
																			)
																		) {
																			// Letters A,B -> indices
																			const idxs = parts.map(
																				(p: string) =>
																					p.toUpperCase().charCodeAt(0) - 65
																			);
																			isCorrect = idxs.includes(idx);
																		} else {
																			// Try matching by full option text or by loose contains
																			const optText = normalize(option);
																			isCorrect = parts.some((p: string) => {
																				const pp = p
																					.replace(/^\s*[A-Za-z]\.\s*/, "")
																					.trim();
																				return (
																					pp === optText ||
																					pp === optText.replace(/\s+/g, " ") ||
																					optText.includes(pp) ||
																					pp.includes(optText)
																				);
																			});
																		}
																	}
																} else {
																	const caRaw = normalize(
																		question.correctAnswer
																	);
																	if (/^\d+$/.test(caRaw)) {
																		isCorrect = Number(caRaw) === idx;
																	} else if (/^[A-Za-z]$/.test(caRaw)) {
																		isCorrect =
																			caRaw.toUpperCase().charCodeAt(0) - 65 ===
																			idx;
																	} else {
																		isCorrect = caRaw === normalize(option);
																	}
																}
																return (
																	<div
																		key={idx}
																		className={`p-3 rounded text-sm border ${
																			isCorrect
																				? "bg-green-100 border-green-300 text-green-800"
																				: "bg-gray-100 border-gray-200 text-gray-700"
																		}`}
																	>
																		<div className="flex items-start justify-between gap-2">
																			<div className="flex-1">
																				<div>
																					<span className="font-medium">
																						{String.fromCharCode(65 + idx)}.
																					</span>{" "}
																					{option}
																				</div>
																				{isCorrect && (
																					<span className="ml-2 font-bold">
																						✓ Benar
																					</span>
																				)}
																			</div>
																			{/* Display option image if exists */}
																			{((question as any).optionImages?.[idx] ||
																				(question as any).optionImagePreviews?.[
																					idx
																				]) && (
																				<img
																					src={
																						(question as any)
																							.optionImagePreviews?.[idx] ||
																						getImageUrl(
																							(question as any).optionImages?.[
																								idx
																							]
																						)
																					}
																					alt={`Option ${String.fromCharCode(
																						65 + idx
																					)}`}
																					className="w-20 h-20 object-contain rounded border flex-shrink-0"
																				/>
																			)}
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												</div>
											)}

											<div className="mt-4 pt-4 border-t flex gap-2">
												<Link
													href={`/exams/${exam.id}/edit?questionId=${question.id}`}
													className="btn btn-secondary btn-sm"
												>
													Edit
												</Link>
												<button className="btn btn-danger btn-sm">Hapus</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Delete Modal */}
				<ConfirmationModal
					isOpen={deleteModal}
					title="Hapus Ujian?"
					message="Yakin ingin menghapus ujian ini? Semua data ujian, soal, dan hasil ujian siswa akan terhapus permanen."
					confirmText="Hapus"
					cancelText="Batal"
					isDangerous
					isLoading={statusLoading}
					onConfirm={handleDelete}
					onCancel={() => setDeleteModal(false)}
				/>

				{/* Status Change Modal */}
				<ConfirmationModal
					isOpen={statusModal.isOpen}
					title={statusModal.title}
					message={statusModal.message}
					confirmText="Ya, Lanjutkan"
					cancelText="Batal"
					isLoading={statusLoading}
					onConfirm={() => {
						if (statusModal.action) {
							handleStatusChange(statusModal.action);
						}
					}}
					onCancel={() =>
						setStatusModal({
							isOpen: false,
							action: null,
							title: "",
							message: "",
						})
					}
				/>
			</div>
		</Layout>
	);
}
