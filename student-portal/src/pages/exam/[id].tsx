import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import StartExamModal from "@/components/StartExamModal";
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
	const [showStartModal, setShowStartModal] = useState(false);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tokenInput, setTokenInput] = useState("");
	const [submittingWithToken, setSubmittingWithToken] = useState(false);
	const [isStarting, setIsStarting] = useState(false);

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
			setIsStarting(true);
			const payload = token ? { token } : {};
			const res = await api.post(`/submissions/start/${id}`, payload);
			const sub = res.data;
			router.push(`/exam/${id}/take?submissionId=${sub.id}`);
		} catch (err: any) {
			const msg = err?.response?.data?.message || "Gagal memulai ujian";
			toast.error(msg);
		} finally {
			setIsStarting(false);
		}
	};

	const handleStart = async () => {
		if (exam.requireToken) {
			setShowTokenModal(true);
		} else {
			setShowStartModal(true);
		}
	};

	const handleConfirmStartExam = async () => {
		setShowStartModal(false);
		await startExam();
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
				<div className="flex items-center justify-center min-h-64 md:h-64 px-4">
					<div className="text-lg md:text-xl">Memuat informasi ujian...</div>
				</div>
			</Layout>
		);
	}

	if (!exam) {
		return (
			<Layout>
				<div className="flex items-center justify-center min-h-64 md:h-64 px-4">
					<div className="text-gray-600 text-center">
						Ujian tidak ditemukan.
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-2 md:py-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
				{/* Mobile-optimized card */}
				<div className="rounded-xl md:rounded-2xl bg-white p-4 md:p-6 shadow">
					{/* Title */}
					<h1 className="text-xl md:text-2xl font-bold leading-tight">
						{exam.title}
					</h1>
					<p className="text-xs md:text-sm text-gray-600 mt-2 line-clamp-2">
						{exam.description || "-"}
					</p>

					{/* Info Grid - Responsive */}
					<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm text-gray-700">
						<div className="p-2 md:p-3 bg-blue-50 rounded">
							<div className="text-xs md:text-xs text-gray-500 font-medium">
								Durasi
							</div>
							<div className="font-bold text-blue-600 mt-1">
								{exam.duration ?? "-"} menit
							</div>
						</div>
						<div className="p-2 md:p-3 bg-green-50 rounded">
							<div className="text-xs md:text-xs text-gray-500 font-medium">
								Soal
							</div>
							<div className="font-bold text-green-600 mt-1">
								{exam.totalQuestions ?? "-"}
							</div>
						</div>
						<div className="col-span-2 md:col-span-1 p-2 md:p-3 bg-purple-50 rounded">
							<div className="text-xs md:text-xs text-gray-500 font-medium">
								Periode
							</div>
							<div className="font-bold text-purple-600 mt-1 text-xs md:text-sm">
								{format(new Date(exam.startTime), "dd MMM")}
								<br />
								{format(new Date(exam.startTime), "HH:mm")} -{" "}
								{format(new Date(exam.endTime), "HH:mm")}
							</div>
						</div>
						<div className="col-span-2 md:col-span-1 p-2 md:p-3 bg-orange-50 rounded">
							<div className="text-xs md:text-xs text-gray-500 font-medium">
								Hasil
							</div>
							<div className="font-bold text-orange-600 mt-1 text-xs md:text-sm">
								{exam.showResultImmediately ? "Langsung" : "Setelah dinilai"}
							</div>
						</div>
					</div>

					{/* Rules section */}
					<div className="mt-4 md:mt-6 border-t pt-3 md:pt-4">
						<h3 className="font-semibold text-sm md:text-base">
							Persiapan & Aturan
						</h3>
						<ul className="list-disc list-inside mt-2 text-xs md:text-sm text-gray-700 space-y-1">
							<li>Siapkan alat tulis jika diperlukan.</li>
							<li>Pastikan koneksi internet stabil.</li>
							<li>Jangan refresh atau tutup browser/app.</li>
							<li>Jawaban tidak bisa diubah setelah dikumpulkan.</li>
							<li>Gambar soal akan tampil di halaman ujian.</li>
							<li className="text-red-600 font-medium">
								Di smartphone: Ujian akan fullscreen dan screenshot terblokir.
							</li>
						</ul>
					</div>

					{/* Action Button - Responsive */}
					<div className="mt-6 flex gap-3 md:gap-0 md:justify-end">
						<button
							onClick={handleStart}
							className="flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-2 bg-blue-600 text-white text-sm md:text-base rounded-lg hover:bg-blue-700 transition font-medium"
						>
							Mulai Ujian
						</button>
					</div>
				</div>

				{/* Token Input Modal - Responsive */}
				{showTokenModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
						<div className="bg-white rounded-t-2xl md:rounded-lg p-4 md:p-6 shadow-xl w-full md:max-w-sm md:mx-4 animate-in slide-in-from-bottom md:slide-in-from-center">
							<h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3">
								Token Ujian Diperlukan
							</h2>
							<p className="text-xs md:text-sm text-gray-600 mb-4">
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
								className="w-full px-3 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
								maxLength={10}
								disabled={submittingWithToken}
								autoFocus
							/>
							<div className="flex gap-2 md:gap-3 justify-end">
								<button
									onClick={handleCloseTokenModal}
									className="flex-1 md:flex-none px-3 md:px-4 py-2 text-xs md:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
									disabled={submittingWithToken}
								>
									Batal
								</button>
								<button
									onClick={handleSubmitToken}
									className="flex-1 md:flex-none px-3 md:px-4 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
									disabled={submittingWithToken}
								>
									{submittingWithToken ? "Memproses..." : "Lanjutkan"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			<StartExamModal
				isOpen={showStartModal}
				exam={exam}
				isLoading={isStarting}
				onConfirm={handleConfirmStartExam}
				onCancel={() => setShowStartModal(false)}
			/>
		</Layout>
	);
}
