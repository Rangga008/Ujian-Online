import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function ExamPage() {
	const router = useRouter();
	const { id } = router.query;

	const [exam, setExam] = useState<any>(null);
	const [loading, setLoading] = useState(true);

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

	const handleStart = async () => {
		try {
			const res = await api.post(`/submissions/start/${id}`);
			const sub = res.data;
			router.push(`/exam/${id}/take?submissionId=${sub.id}`);
		} catch (err: any) {
			const msg = err?.response?.data?.message || "Gagal memulai ujian";
			toast.error(msg);
		}
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
			</div>
		</Layout>
	);
}
