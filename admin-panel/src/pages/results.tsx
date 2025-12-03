import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

export default function ResultsPage() {
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [classes, setClasses] = useState<Class[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
	const [exams, setExams] = useState<any[]>([]);
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const init = async () => {
			try {
				const [active, allSemesters] = await Promise.all([
					semestersApi.getActive().catch(() => null),
					semestersApi.getAll(),
				]);
				setActiveSemester(active);
				setSemesters(allSemesters);
				setSelectedSemesterId(active ? active.id : "all");
				const allClasses = await classesApi.getAll();
				setClasses(allClasses);
				await fetchExams();
			} catch (e) {
				toast.error("Gagal memuat data awal");
			} finally {
				setLoading(false);
			}
		};
		init();
	}, []);

	useEffect(() => {
		// When filters change, refetch exams accordingly
		const refetch = async () => {
			await fetchExams();
			setSelectedExamId(null);
			setSubmissions([]);
		};
		refetch();
	}, [selectedSemesterId, selectedClassId]);

	useEffect(() => {
		if (selectedExamId) {
			fetchSubmissions(selectedExamId);
		} else {
			setSubmissions([]);
		}
	}, [selectedExamId]);

	const fetchExams = async () => {
		try {
			const params: Record<string, any> = {};
			if (selectedSemesterId !== "all") params.semesterId = selectedSemesterId;
			if (selectedClassId !== "all") params.classId = selectedClassId;
			const response = await api.get("/exams", { params });
			setExams(response.data);
		} catch (error) {
			toast.error("Gagal memuat data ujian");
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
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-8">Hasil Ujian</h1>

				{/* Filters: Semester, Class, Exam */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div className="card">
						<label className="block text-sm font-medium mb-2">Semester</label>
						<select
							value={selectedSemesterId}
							onChange={(e) =>
								setSelectedSemesterId(
									e.target.value === "all" ? "all" : parseInt(e.target.value)
								)
							}
							className="input"
						>
							<option value="all">Semua Semester</option>
							{semesters
								.sort((a, b) => a.year.localeCompare(b.year))
								.map((sem) => (
									<option key={sem.id} value={sem.id}>
										{sem.name} - {sem.year}
									</option>
								))}
						</select>
					</div>
					<div className="card">
						<label className="block text-sm font-medium mb-2">Kelas</label>
						<select
							value={selectedClassId}
							onChange={(e) =>
								setSelectedClassId(
									e.target.value === "all" ? "all" : parseInt(e.target.value)
								)
							}
							className="input"
						>
							<option value="all">Semua Kelas</option>
							{classes
								.filter((c) =>
									selectedSemesterId === "all"
										? true
										: c.semesterId === selectedSemesterId
								)
								.map((cls) => (
									<option key={cls.id} value={cls.id}>
										{cls.name} - {cls.major}
									</option>
								))}
						</select>
					</div>
					<div className="card">
						<label className="block text-sm font-medium mb-2">Ujian</label>
						<select
							value={selectedExamId || ""}
							onChange={(e) => setSelectedExamId(Number(e.target.value))}
							className="input"
						>
							<option value="" disabled>
								Pilih ujian
							</option>
							{exams.map((exam) => (
								<option key={exam.id} value={exam.id}>
									{exam.title}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Submissions table: only show after an exam selected */}
				<div className="card">
					<h2 className="text-xl font-bold mb-6">
						Daftar Pengerjaan
						{submissions.length > 0 && (
							<span className="text-gray-600 font-normal text-base ml-2">
								({submissions.length} siswa)
							</span>
						)}
					</h2>

					{!selectedExamId ? (
						<p className="text-gray-600 text-center py-8">
							Pilih ujian untuk melihat hasil.
						</p>
					) : submissions.length === 0 ? (
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
											<td className="p-4">{submission.totalAnswered || 0}</td>
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
			</div>
		</Layout>
	);
}
