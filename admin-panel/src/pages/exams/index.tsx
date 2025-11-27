import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function ExamsPage() {
	const [exams, setExams] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchExams();
	}, []);

	const fetchExams = async () => {
		try {
			const response = await api.get("/exams");
			setExams(response.data);
		} catch (error) {
			toast.error("Gagal memuat data ujian");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Yakin ingin menghapus ujian ini?")) return;

		try {
			await api.delete(`/exams/${id}`);
			toast.success("Ujian berhasil dihapus");
			fetchExams();
		} catch (error) {
			toast.error("Gagal menghapus ujian");
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
			<Layout>
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div>
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Kelola Ujian</h1>
					<Link href="/exams/create" className="btn btn-primary">
						+ Buat Ujian Baru
					</Link>
				</div>

				{exams.length === 0 ? (
					<div className="card text-center py-12">
						<p className="text-gray-600 mb-4">Belum ada ujian</p>
						<Link href="/exams/create" className="btn btn-primary">
							Buat Ujian Pertama
						</Link>
					</div>
				) : (
					<div className="grid gap-6">
						{exams.map((exam) => (
							<div key={exam.id} className="card">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-xl font-bold text-gray-900">
												{exam.title}
											</h3>
											<span
												className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
													exam.status
												)}`}
											>
												{exam.status}
											</span>
										</div>
										<p className="text-gray-600 mb-4">{exam.description}</p>
										<div className="flex gap-6 text-sm text-gray-600">
											<span>⏱️ {exam.duration} menit</span>
											<span>📝 {exam.totalQuestions} soal</span>
											<span>🎯 {exam.totalScore} poin</span>
											<span>
												📅 {format(new Date(exam.startTime), "dd MMM yyyy")}
											</span>
										</div>
									</div>
									<div className="flex gap-2">
										<Link
											href={`/exams/${exam.id}`}
											className="btn btn-secondary"
										>
											Detail
										</Link>
										<Link
											href={`/exams/${exam.id}/edit`}
											className="btn btn-primary"
										>
											Edit
										</Link>
										<button
											onClick={() => handleDelete(exam.id)}
											className="btn btn-danger"
										>
											Hapus
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
}
