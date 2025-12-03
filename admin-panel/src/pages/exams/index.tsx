import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

export default function ExamsPage() {
	const [exams, setExams] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [classes, setClasses] = useState<Class[]>([]);
	const [selectedClass, setSelectedClass] = useState<string>("all");

	useEffect(() => {
		fetchInitialData();
	}, []);

	const fetchInitialData = async () => {
		try {
			const [active, allSemesters] = await Promise.all([
				semestersApi.getActive().catch(() => null),
				semestersApi.getAll(),
			]);
			setActiveSemester(active);
			setSemesters(allSemesters);
			setSelectedSemesterId(active ? active.id : "all");
			const classesData = await classesApi.getAll();
			setClasses(classesData);
			await fetchExams();
		} catch (error) {
			toast.error("Gagal memuat data");
		}
	};

	const fetchExams = async () => {
		try {
			const params: Record<string, any> = {};
			if (selectedSemesterId !== "all") {
				params.semesterId = selectedSemesterId;
			}
			const response = await api.get("/exams", { params });
			setExams(response.data);
		} catch (error) {
			toast.error("Gagal memuat data ujian");
		} finally {
			setLoading(false);
		}
	};

	const filteredByClass =
		selectedClass === "all"
			? exams
			: exams.filter((e) => e.classId === parseInt(selectedClass));

	const filteredExams =
		selectedSemesterId === "all"
			? filteredByClass
			: filteredByClass.filter((e) => e.semesterId === selectedSemesterId);

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
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Kelola Ujian</h1>
						{activeSemester ? (
							<p className="text-gray-600 mt-2">
								Semester {activeSemester.type === "ganjil" ? "Ganjil" : "Genap"}{" "}
								{activeSemester.year}
							</p>
						) : (
							<p className="text-gray-600 mt-2">Tidak ada semester aktif</p>
						)}
					</div>
					<Link href="/exams/create" className="btn btn-primary">
						+ Buat Ujian Baru
					</Link>
				</div>

				{/* Filters: Semester and Class */}
				<div className="mb-6 flex gap-4 items-end">
					<div>
						<label className="block text-sm font-medium mb-2">
							Filter Semester:
						</label>
						<select
							value={selectedSemesterId}
							onChange={(e) =>
								setSelectedSemesterId(
									e.target.value === "all" ? "all" : parseInt(e.target.value)
								)
							}
							className="input max-w-xs"
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
					<div>
						<label className="block text-sm font-medium mb-2">
							Filter Kelas:
						</label>
						<select
							value={selectedClass}
							onChange={(e) => setSelectedClass(e.target.value)}
							className="input max-w-xs"
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
				</div>

				{filteredExams.length === 0 ? (
					<div className="card text-center py-12">
						<p className="text-gray-600 mb-4">Belum ada ujian</p>
						<Link href="/exams/create" className="btn btn-primary">
							Buat Ujian Pertama
						</Link>
					</div>
				) : (
					<div className="grid gap-6">
						{filteredExams.map((exam) => {
							const examClass = classes.find((c) => c.id === exam.classId);
							return (
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
												{examClass && (
													<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
														{examClass.name}
													</span>
												)}
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
							);
						})}
					</div>
				)}
			</div>
		</Layout>
	);
}
