import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ExamPage() {
	const router = useRouter();
	const { id } = router.query;
	const { isAuthenticated } = useAuthGuard();

	const [exam, setExam] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tokenInput, setTokenInput] = useState("");
	const [submittingWithToken, setSubmittingWithToken] = useState(false);

	useEffect(() => {
		if (id) fetchExam();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const fetchExam = async () => {
		try {
			const res = await api.get(`/exams/${id}`);
			setExam(res.data);
		} catch (error) {
			toast.error("Gagal memuat ujian");
			router.push("/dashboard");
		} finally {
			setLoading(false);
		}
	};

	const startExam = async (token?: string) => {
		try {
			const payload = token ? { token } : {};
			const res = await api.post(`/submissions/start/${id}`, payload);
			const sub = res.data;
			router.push(`/exam/${id}/take?submissionId=${sub.id}`);
		} catch (err: any) {
			const msg = err?.response?.data?.message || "Gagal memulai ujian";
			toast.error(msg);
		}
	};

	const handleStart = async () => {
		if (exam.requireToken) {
			setShowTokenModal(true);
		} else {
			await startExam();
		}
	};

	const handleSubmitToken = async () => {
		if (!tokenInput.trim()) {
			toast.error("Token tidak boleh kosong");
			return;
		}

		setSubmittingWithToken(true);
		try {
			await startExam(tokenInput.trim());
		} finally {
			setSubmittingWithToken(false);
			setTokenInput("");
			setShowTokenModal(false);
		}
	};

	const handleCloseTokenModal = () => {
		setShowTokenModal(false);
		setTokenInput("");
	};

	if (loading) {
		return (
			<Layout>
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Memuat informasi ujian...</div>
				</div>
			</Layout>
		);
	}

	if (!exam) {
		return (
			<Layout>
				<div className="flex items-center justify-center h-64">
					<div className="text-gray-600">Ujian tidak ditemukan.</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="max-w-3xl mx-auto space-y-6">
				<div className="rounded-2xl bg-white p-6 shadow">
					<h1 className="text-2xl font-bold">{exam.title}</h1>
					<p className="text-sm text-gray-600 mt-2">
						{exam.description || "-"}
					</p>

					<div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
						<div>
							<div className="text-xs text-gray-500">Durasi</div>
							<div className="font-medium">{exam.duration ?? "-"} menit</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Soal</div>
							<div className="font-medium">
								{exam.totalQuestions ?? "-"} soal
							</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Periode</div>
							<div className="font-medium">
								{format(new Date(exam.startTime), "dd MMM yyyy HH:mm")} -{" "}
								{format(new Date(exam.endTime), "HH:mm")}
							</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Tampilkan hasil</div>
							<div className="font-medium">
								{exam.showResultImmediately ? "Langsung" : "Setelah dinilai"}
							</div>
						</div>
					</div>

					<div className="mt-6 border-t pt-4">
						<h3 className="font-semibold">Persiapan & Aturan</h3>
						<ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
							<li>Siapkan alat tulis jika diperlukan.</li>
							<li>Pastikan koneksi internet stabil.</li>
							<li>Jangan refresh atau tutup browser selama ujian.</li>
							<li>Setelah dikumpulkan, jawaban tidak bisa diubah.</li>
							<li>Jika ada gambar soal, tampil di halaman ujian.</li>
						</ul>
					</div>

					<div className="mt-6 flex justify-end">
						<button
							onClick={handleStart}
							className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Mulai Ujian
						</button>
					</div>
				</div>

				{/* Token Input Modal */}
				{showTokenModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
							<h2 className="text-lg font-bold mb-3">Token Ujian Diperlukan</h2>
							<p className="text-sm text-gray-600 mb-4">
								Ujian ini memerlukan token untuk memulai. Silakan masukkan token
								yang diberikan oleh guru.
							</p>
							<input
								type="text"
								value={tokenInput}
								onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
								onKeyPress={(e) => {
									if (e.key === "Enter") handleSubmitToken();
								}}
								placeholder="Masukkan token (misal: A1B2C3)"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
								maxLength={10}
								disabled={submittingWithToken}
								autoFocus
							/>
							<div className="flex gap-3 justify-end">
								<button
									onClick={handleCloseTokenModal}
									className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
									disabled={submittingWithToken}
								>
									Batal
								</button>
								<button
									onClick={handleSubmitToken}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
									disabled={submittingWithToken}
								>
									{submittingWithToken ? "Memproses..." : "Lanjutkan"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
