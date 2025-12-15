import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

export default function SemesterResultsPage() {
	const router = useRouter();
	const { semesterId } = router.query;

	const [semester, setSemester] = useState<Semester | null>(null);
	const [classes, setClasses] = useState<Class[]>([]);
	const [exams, setExams] = useState<any[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!semesterId) return;
		const init = async () => {
			setLoading(true);
			try {
				const id = Number(semesterId);
				const allSemesters = await semestersApi.getAll();
				const found = allSemesters.find((s) => s.id === id) || null;
				setSemester(found);

				const allClasses = await classesApi.getAll();
				setClasses(allClasses.filter((c) => c.semesterId === id));

				const resp = await api.get("/exams", { params: { semesterId: id } });
				setExams(resp.data || []);
			} catch (err) {
				toast.error("Gagal memuat data semester");
			} finally {
				setLoading(false);
			}
		};
		init();
	}, [semesterId]);

	const handleOpenExam = (examId: number) => {
		const query: Record<string, any> = {};
		if (selectedClassId !== "all") query.classId = selectedClassId;
		router.push({
			pathname: `/results/semester/${semesterId}/exam/${examId}`,
			query,
		});
	};

	return (
		<Layout title={semester ? `Hasil - ${semester.name}` : "Hasil Semester"}>
			<Head>
				<title>Hasil Semester - Admin</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
					Hasil Ujian - Semester
				</h1>

				{loading ? (
					<div className="card">Memuat...</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
							<div className="card">
								<label className="block text-sm font-medium mb-2">
									Semester
								</label>
								<div className="text-sm text-gray-700">
									{semester
										? `${semester.name} - ${semester.year}`
										: "Tidak ditemukan"}
								</div>
							</div>

							<div className="card">
								<label className="block text-sm font-medium mb-2">
									Filter Kelas
								</label>
								<select
									className="input"
									value={selectedClassId}
									onChange={(e) =>
										setSelectedClassId(
											e.target.value === "all" ? "all" : Number(e.target.value)
										)
									}
								>
									<option value="all">Semua Kelas</option>
									{classes.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} - {c.major}
										</option>
									))}
								</select>
							</div>

							<div className="card">
								<label className="block text-sm font-medium mb-2">Aksi</label>
								<div className="space-y-2">
									<Link href="/results">
										<a className="btn">Kembali ke Hasil</a>
									</Link>
								</div>
							</div>
						</div>

						<div className="card">
							<h2 className="text-xl font-bold mb-4">Daftar Ujian Semester</h2>
							{exams.length === 0 ? (
								<p className="text-gray-600">
									Belum ada ujian untuk semester ini.
								</p>
							) : (
								<div className="space-y-4">
									{exams.map((exam) => (
										<div
											key={exam.id}
											className="p-4 border rounded-md flex items-center justify-between"
										>
											<div>
												<div className="font-medium">{exam.title}</div>
												<div className="text-sm text-gray-600">
													Durasi: {exam.duration} menit
												</div>
											</div>
											<div className="flex items-center space-x-2">
												<button
													className="btn"
													onClick={() => handleOpenExam(exam.id)}
												>
													Lihat Hasil per Kelas
												</button>
												<Link
													href={{
														pathname: `/exams/${exam.id}`,
													}}
												>
													<a className="btn-secondary">Lihat Detail Ujian</a>
												</Link>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</Layout>
	);
}
