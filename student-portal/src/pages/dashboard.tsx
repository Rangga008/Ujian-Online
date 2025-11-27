import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function DashboardPage() {
	const [activeExams, setActiveExams] = useState<any[]>([]);
	const [mySubmissions, setMySubmissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [examsRes, submissionsRes] = await Promise.all([
				api.get("/exams/active"),
				api.get("/submissions/my-submissions"),
			]);

			setActiveExams(examsRes.data);
			setMySubmissions(submissionsRes.data);
		} catch (error) {
			toast.error("Gagal memuat data");
		} finally {
			setLoading(false);
		}
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
				<h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

				{/* Active Exams */}
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-4">
						Ujian Tersedia
					</h2>

					{activeExams.length === 0 ? (
						<div className="card text-center py-12">
							<p className="text-gray-600">
								Tidak ada ujian yang tersedia saat ini
							</p>
						</div>
					) : (
						<div className="grid gap-6">
							{activeExams.map((exam) => {
								const hasSubmission = mySubmissions.find(
									(s) => s.exam.id === exam.id && s.status !== "submitted"
								);

								return (
									<div key={exam.id} className="card">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="text-xl font-bold text-gray-900 mb-2">
													{exam.title}
												</h3>
												<p className="text-gray-600 mb-4">{exam.description}</p>
												<div className="flex gap-6 text-sm text-gray-600">
													<span>⏱️ {exam.duration} menit</span>
													<span>📝 {exam.totalQuestions} soal</span>
													<span>🎯 {exam.totalScore} poin</span>
												</div>
												<p className="text-sm text-gray-500 mt-2">
													Mulai:{" "}
													{format(
														new Date(exam.startTime),
														"dd MMM yyyy HH:mm"
													)}{" "}
													- Selesai:{" "}
													{format(new Date(exam.endTime), "dd MMM yyyy HH:mm")}
												</p>
											</div>
											<Link
												href={`/exam/${exam.id}`}
												className="btn btn-primary"
											>
												{hasSubmission ? "Lanjutkan" : "Mulai Ujian"}
											</Link>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* My Submissions */}
				<div>
					<h2 className="text-2xl font-bold text-gray-900 mb-4">
						Riwayat Ujian
					</h2>

					{mySubmissions.length === 0 ? (
						<div className="card text-center py-12">
							<p className="text-gray-600">Anda belum mengerjakan ujian</p>
						</div>
					) : (
						<div className="card">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left p-4">Nama Ujian</th>
											<th className="text-left p-4">Status</th>
											<th className="text-left p-4">Nilai</th>
											<th className="text-left p-4">Soal Dijawab</th>
											<th className="text-left p-4">Waktu</th>
										</tr>
									</thead>
									<tbody>
										{mySubmissions.map((submission) => (
											<tr
												key={submission.id}
												className="border-b hover:bg-gray-50"
											>
												<td className="p-4 font-medium">
													{submission.exam?.title || "-"}
												</td>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm ${
															submission.status === "submitted"
																? "bg-green-100 text-green-800"
																: submission.status === "in_progress"
																? "bg-blue-100 text-blue-800"
																: "bg-gray-100 text-gray-800"
														}`}
													>
														{submission.status === "submitted"
															? "Selesai"
															: submission.status === "in_progress"
															? "Sedang Dikerjakan"
															: "Draft"}
													</span>
												</td>
												<td className="p-4">
													{submission.score !== null ? (
														<span className="font-bold text-primary-600">
															{submission.score}
														</span>
													) : (
														"-"
													)}
												</td>
												<td className="p-4">{submission.totalAnswered || 0}</td>
												<td className="p-4 text-sm text-gray-600">
													{submission.submittedAt
														? format(
																new Date(submission.submittedAt),
																"dd MMM yyyy HH:mm"
														  )
														: "-"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
