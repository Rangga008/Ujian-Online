import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ResultsPage() {
	const [exams, setExams] = useState<any[]>([]);
	const [selectedExam, setSelectedExam] = useState<number | null>(null);
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchExams();
	}, []);

	useEffect(() => {
		if (selectedExam) {
			fetchSubmissions(selectedExam);
		}
	}, [selectedExam]);

	const fetchExams = async () => {
		try {
			const response = await api.get("/exams");
			setExams(response.data);
			if (response.data.length > 0) {
				setSelectedExam(response.data[0].id);
			}
		} catch (error) {
			toast.error("Gagal memuat data ujian");
		} finally {
			setLoading(false);
		}
	};

	const fetchSubmissions = async (examId: number) => {
		try {
			const response = await api.get(`/submissions/exam/${examId}`);
			setSubmissions(response.data);
		} catch (error) {
			toast.error("Gagal memuat hasil ujian");
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
				<h1 className="text-3xl font-bold text-gray-900 mb-8">Hasil Ujian</h1>

				{exams.length === 0 ? (
					<div className="card text-center py-12">
						<p className="text-gray-600">Belum ada ujian</p>
					</div>
				) : (
					<>
						<div className="card mb-6">
							<label className="block text-sm font-medium mb-2">
								Pilih Ujian
							</label>
							<select
								value={selectedExam || ""}
								onChange={(e) => setSelectedExam(Number(e.target.value))}
								className="input max-w-md"
							>
								{exams.map((exam) => (
									<option key={exam.id} value={exam.id}>
										{exam.title}
									</option>
								))}
							</select>
						</div>

						<div className="card">
							<h2 className="text-xl font-bold mb-6">
								Daftar Pengerjaan
								{submissions.length > 0 && (
									<span className="text-gray-600 font-normal text-base ml-2">
										({submissions.length} siswa)
									</span>
								)}
							</h2>

							{submissions.length === 0 ? (
								<p className="text-gray-600 text-center py-8">
									Belum ada siswa yang mengerjakan
								</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b">
												<th className="text-left p-4">Nama Siswa</th>
												<th className="text-left p-4">NIS</th>
												<th className="text-left p-4">Status</th>
												<th className="text-left p-4">Nilai</th>
												<th className="text-left p-4">Soal Dijawab</th>
												<th className="text-left p-4">Waktu Selesai</th>
											</tr>
										</thead>
										<tbody>
											{submissions.map((submission) => (
												<tr
													key={submission.id}
													className="border-b hover:bg-gray-50"
												>
													<td className="p-4 font-medium">
														{submission.user?.name || "-"}
													</td>
													<td className="p-4">{submission.user?.nis || "-"}</td>
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
															{submission.status}
														</span>
													</td>
													<td className="p-4 font-bold text-primary-600">
														{submission.score !== null ? submission.score : "-"}
													</td>
													<td className="p-4">
														{submission.totalAnswered || 0}
													</td>
													<td className="p-4">
														{submission.submittedAt
															? new Date(submission.submittedAt).toLocaleString(
																	"id-ID"
															  )
															: "-"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</Layout>
	);
}
