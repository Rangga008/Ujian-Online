import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function SubmissionDetailPage() {
	const router = useRouter();
	const { submissionId } = router.query;

	const [submission, setSubmission] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [answersState, setAnswersState] = useState<Record<number, number>>({});
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		if (!submissionId) return;
		const load = async () => {
			setLoading(true);
			try {
				const resp = await api.get(`/submissions/${submissionId}`);
				console.log("Submission data:", resp.data);
				setSubmission(resp.data);
				const map: Record<number, number> = {};
				(resp.data.answers || []).forEach(
					(a: any) => (map[a.id] = a.points || 0)
				);
				setAnswersState(map);
			} catch (err) {
				console.error(err);
				toast.error("Gagal memuat data pengerjaan");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [submissionId]);

	const updatePoint = (answerId: number, value: number) => {
		setAnswersState((s) => ({ ...s, [answerId]: value }));
	};

	const handleSave = async () => {
		if (!submission) return;
		setSaving(true);
		try {
			const payload = {
				answers: Object.keys(answersState).map((k) => ({
					id: Number(k),
					points: Number(answersState[Number(k)]),
				})),
			};
			await api.post(`/submissions/${submission.id}/grade`, payload);
			toast.success("Perubahan tersimpan");
			const resp = await api.get(`/submissions/${submission.id}`);
			setSubmission(resp.data);
		} catch (err) {
			console.error(err);
			toast.error("Gagal menyimpan nilai");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!submission) return;
		setDeleting(true);
		try {
			await api.delete(`/submissions/${submission.id}`);
			toast.success("Pengerjaan dihapus");
			// Redirect to class exam results to ensure the submissions list reloads
			const classId = submission.student?.classId || submission.user?.classId;
			const examId = submission.exam?.id || submission.examId;
			if (classId && examId) {
				// Add timestamp to force fresh fetch
				router.push(`/results/class/${classId}/exam/${examId}?t=${Date.now()}`);
			} else {
				router.back();
			}
		} catch (err) {
			console.error(err);
			toast.error("Gagal menghapus pengerjaan");
		} finally {
			setDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	if (loading) {
		return (
			<Layout title="Detail Pengerjaan">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Memuat...</div>
				</div>
			</Layout>
		);
	}

	if (!submission) {
		return (
			<Layout title="Detail Pengerjaan">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Data tidak ditemukan</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title={`Pengerjaan - ${submission.user?.name || submission.id}`}>
			<Head>
				<title>Detail Pengerjaan</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="card mb-6">
					<h1 className="text-2xl font-bold">Detail Pengerjaan</h1>
					<div className="mt-2 text-sm text-gray-700">
						Siswa: {submission.user?.name} ({submission.user?.nis})
					</div>
					<div className="mt-1 text-sm text-gray-700">
						Status: {submission.status}
					</div>
					<div className="mt-1 text-sm text-gray-700">
						Nilai: {submission.score ?? "-"}
					</div>
				</div>

				<div className="card">
					<h2 className="text-xl font-bold mb-4">Jawaban</h2>
					{!submission.answers || submission.answers.length === 0 ? (
						<p className="text-gray-600 text-center py-8">
							Tidak ada jawaban untuk submission ini.
						</p>
					) : (
						<>
							{(submission.answers || []).map((a: any) => {
								const isEssay = a.question?.type === "essay";
								const isMC =
									a.question?.type === "multiple_choice" ||
									a.question?.type === "true_false" ||
									a.question?.type === "mixed_multiple_choice";
								return (
									<div key={a.id} className="mb-6 border-b pb-6">
										<div className="font-medium text-lg">
											Soal #{a.question?.orderIndex ?? a.questionId}
											{isEssay && (
												<span className="text-xs ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded">
													Essay
												</span>
											)}
											{isMC && (
												<span className="text-xs ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded">
													Pilihan Ganda
												</span>
											)}
										</div>
										<div className="text-sm text-gray-600 mt-2">
											Jawaban Benar:{" "}
											{(() => {
												const ca = a.question?.correctAnswer ?? "";
												const opts = a.question?.options || [];
												const norm = (s: any) => (s || "").toString().trim();
												// mixed -> may be list of indices, letters, or texts
												if (a.question?.type === "mixed_multiple_choice") {
													let parts = ca
														.split(/[;,|\/]+/) // split on common separators
														.map((p: string) => p.trim())
														.filter(Boolean);
													if (parts.length === 0 && ca.trim())
														parts = ca.split(/\s+/);
													const mapped = parts.map((p: string) => {
														if (/^\d+$/.test(p) && opts[Number(p)])
															return norm(opts[Number(p)]);
														if (/^[A-Za-z]$/.test(p)) {
															const i = p.toUpperCase().charCodeAt(0) - 65;
															if (opts[i]) return norm(opts[i]);
														}
														// fallback: return token
														return p;
													});
													return mapped.join(", ");
												}
												// single-choice or true_false: map index/letter to option text if possible
												if (/^\d+$/.test(ca) && opts[Number(ca)])
													return norm(opts[Number(ca)]);
												if (/^[A-Za-z]$/.test(ca)) {
													const i = ca.toUpperCase().charCodeAt(0) - 65;
													if (opts[i]) return norm(opts[i]);
												}
												return ca;
											})()}
										</div>
										{a.question?.imageUrl && (
											<img
												src={a.question.imageUrl}
												alt="soal"
												className="mt-2 max-w-xs"
											/>
										)}

										{isMC && (
											<div className="mt-4">
												<div className="text-sm font-medium text-gray-700">
													Jawaban Siswa:
												</div>
												<div className="p-3 bg-gray-50 rounded mt-2">
													<div className="font-medium">{a.answer || "-"}</div>
													<div className="text-sm mt-2">
														<span
															className={`px-2 py-1 rounded ${
																a.isCorrect
																	? "bg-green-100 text-green-800"
																	: "bg-red-100 text-red-800"
															}`}
														>
															{a.isCorrect ? "✓ Benar" : "✗ Salah"}
														</span>
													</div>
												</div>
												<div className="text-sm text-gray-600 mt-2">
													Jawaban Benar:{" "}
													{(() => {
														const ca = a.question?.correctAnswer ?? "";
														const opts = a.question?.options || [];
														const norm = (s: any) =>
															(s || "").toString().trim();
														if (a.question?.type === "mixed_multiple_choice") {
															let parts = ca
																.split(/[;,|\/\s]+/)
																.map((p: string) => p.trim())
																.filter(Boolean);
															const mapped = parts.map((p: string) => {
																if (/^\d+$/.test(p) && opts[Number(p)])
																	return norm(opts[Number(p)]);
																if (/^[A-Za-z]$/.test(p)) {
																	const i = p.toUpperCase().charCodeAt(0) - 65;
																	if (opts[i]) return norm(opts[i]);
																}
																return p;
															});
															return mapped.join(", ");
														}
														if (/^\d+$/.test(ca) && opts[Number(ca)])
															return norm(opts[Number(ca)]);
														if (/^[A-Za-z]$/.test(ca)) {
															const i = ca.toUpperCase().charCodeAt(0) - 65;
															if (opts[i]) return norm(opts[i]);
														}
														return ca;
													})()}
												</div>
											</div>
										)}

										{isEssay && (
											<div className="mt-4">
												<div className="text-sm font-medium text-gray-700 mb-2">
													Jawaban Siswa:
												</div>
												<div className="p-3 bg-gray-50 rounded">
													{a.answer || "-"}
												</div>

												<div className="mt-4 flex items-end space-x-3">
													<div className="flex-1">
														<label className="text-sm font-medium">
															Nilai (points):
														</label>
														<input
															type="number"
															className="input w-full mt-1"
															value={answersState[a.id] ?? 0}
															onChange={(e) =>
																updatePoint(a.id, Number(e.target.value))
															}
															min={0}
															max={a.question?.points ?? 0}
														/>
													</div>
													<div className="text-sm text-gray-600">
														Max: {a.question?.points ?? "-"}
													</div>
												</div>
											</div>
										)}
									</div>
								);
							})}

							<div className="mt-6 flex items-center justify-between">
								<button
									className="btn-danger"
									onClick={() => setShowDeleteConfirm(true)}
									disabled={deleting}
								>
									🗑️ Hapus Pengerjaan
								</button>
								<div className="flex items-center space-x-2">
									<button
										className="btn-secondary"
										onClick={() => router.back()}
										disabled={saving || deleting}
									>
										Kembali
									</button>
									<button
										className="btn"
										onClick={handleSave}
										disabled={saving || deleting}
									>
										{saving ? "Menyimpan..." : "💾 Simpan Penilaian"}
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-sm mx-2">
						<h3 className="text-lg font-bold text-gray-900 mb-2">
							Hapus Pengerjaan?
						</h3>
						<p className="text-gray-600 mb-6">
							Anda yakin ingin menghapus pengerjaan dari{" "}
							<span className="font-semibold">{submission.user?.name}</span>?
							Tindakan ini tidak dapat dibatalkan.
						</p>
						<div className="flex items-center space-x-3 justify-end">
							<button
								className="btn-secondary"
								onClick={() => setShowDeleteConfirm(false)}
								disabled={deleting}
							>
								Batal
							</button>
							<button
								className="btn-danger"
								onClick={handleDelete}
								disabled={deleting}
							>
								{deleting ? "Menghapus..." : "Ya, Hapus"}
							</button>
						</div>
					</div>
				</div>
			)}
		</Layout>
	);
}
