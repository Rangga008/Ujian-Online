import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
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
}

export default function ExamsPage() {
	const [exams, setExams] = useState<Exam[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchExams();
	}, []);

	const fetchExams = async () => {
		try {
			const res = await api.get("/exams/active");
			setExams(res.data || []);
		} catch (error) {
			toast.error("Gagal memuat daftar ujian");
		} finally {
			setLoading(false);
		}
	};

	const renderDateRange = (start: string, end: string) => {
		const startDate = format(new Date(start), "dd MMM yyyy HH:mm");
		const endDate = format(new Date(end), "HH:mm");
		return `${startDate} - ${endDate}`;
	};

	if (loading) {
		return (
			<Layout>
				<div className="min-h-[50vh] flex items-center justify-center">
					<div className="animate-pulse text-lg text-gray-600">
						Memuat ujian...
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
					<h1 className="text-3xl font-bold">Daftar Ujian</h1>
					<p className="mt-2 text-blue-100">
						Lihat dan mulai semua ujian yang tersedia.
					</p>
				</div>

				{exams.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-md">
						<p className="text-gray-600 text-lg">
							Belum ada ujian yang tersedia.
						</p>
						<p className="text-sm text-gray-500 mt-2">
							Tunggu jadwal ujian dari guru/administrator.
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{exams.map((exam) => (
							<div
								key={exam.id}
								className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition p-5"
							>
								<h3 className="font-bold text-gray-900 text-lg line-clamp-2">
									{exam.title}
								</h3>
								<p className="text-sm text-gray-600 mt-1 line-clamp-2">
									{exam.description || "Tidak ada deskripsi."}
								</p>
								<p className="text-xs text-gray-500 mt-2">
									{renderDateRange(exam.startTime, exam.endTime)}
								</p>

								<div className="mt-4 flex flex-wrap gap-2">
									{exam.duration && (
										<span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
											⏱ {exam.duration} mnt
										</span>
									)}
									{exam.totalQuestions && (
										<span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
											📝 {exam.totalQuestions}
										</span>
									)}
									{exam.totalScore && (
										<span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
											🎯 {exam.totalScore}
										</span>
									)}
								</div>

								<div className="mt-4 pt-4 border-t border-gray-200">
									<Link href={`/exam/${exam.id}`} legacyBehavior>
										<a className="block w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition text-center">
											Lihat Detail
										</a>
									</Link>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
}
