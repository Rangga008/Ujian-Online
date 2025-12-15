import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Exam {
	id: string | number;
	title: string;
	description?: string;
	duration?: number;
	totalQuestions?: number;
	totalScore?: number;
	startTime: string;
	endTime: string;
	class?: {
		name: string;
		grade: number;
	};
}

export default function SearchPage() {
	const [query, setQuery] = useState("");
	const [exams, setExams] = useState<Exam[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchExams();
	}, []);

	const fetchExams = async () => {
		try {
			setLoading(true);
			const res = await api.get("/exams/active");
			setExams(res.data || []);
		} catch (error) {
			toast.error("Gagal memuat ujian");
		} finally {
			setLoading(false);
		}
	};

	const filteredExams = exams.filter(
		(exam) =>
			exam.title.toLowerCase().includes(query.toLowerCase()) ||
			exam.description?.toLowerCase().includes(query.toLowerCase())
	);

	const renderDateRange = (start: string, end: string) => {
		const startDate = format(new Date(start), "dd MMM yyyy HH:mm");
		const endDate = format(new Date(end), "HH:mm");
		return `${startDate} - ${endDate}`;
	};

	return (
		<Layout>
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-2xl p-6 shadow-lg">
					<h1 className="text-3xl font-bold">Cari Ujian</h1>
					<p className="mt-2 text-green-100">
						Cari ujian berdasarkan judul atau deskripsi.
					</p>
				</div>

				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Kata Kunci Pencarian
						</label>
						<input
							type="text"
							placeholder="Masukkan judul ujian atau topik..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
						/>
					</div>

					{loading ? (
						<div className="text-center py-12">
							<p className="text-gray-600">Memuat ujian...</p>
						</div>
					) : filteredExams.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-2xl mb-2">🔍</p>
							<p className="text-gray-600 font-medium">
								{query
									? "Ujian tidak ditemukan"
									: "Belum ada ujian yang tersedia"}
							</p>
							<p className="text-sm text-gray-500 mt-2">
								{query
									? "Coba ubah kata kunci pencarian"
									: "Tunggu jadwal ujian dari guru/administrator"}
							</p>
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{filteredExams.map((exam) => (
								<div
									key={exam.id}
									className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition p-5"
								>
									<h3 className="font-bold text-gray-900 mb-2 text-lg line-clamp-2">
										{exam.title}
									</h3>
									<p className="text-sm text-gray-600 mb-4 line-clamp-2">
										{exam.description || "Tidak ada deskripsi"}
									</p>

									<div className="space-y-2 mb-4 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600">📅 Durasi:</span>
											<span className="font-medium">
												{exam.duration ? `${exam.duration} menit` : "-"}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">❓ Soal:</span>
											<span className="font-medium">
												{exam.totalQuestions || 0}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">⭐ Skor:</span>
											<span className="font-medium">
												{exam.totalScore || 0}
											</span>
										</div>
										<div className="text-xs text-gray-500 border-t pt-2">
											{renderDateRange(exam.startTime, exam.endTime)}
										</div>
									</div>

									<Link href={`/exam/${exam.id}`}>
										<button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm">
											Lihat Detail
										</button>
									</Link>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
