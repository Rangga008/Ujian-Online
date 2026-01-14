import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import classesApi, { Class } from "@/lib/classesApi";

export default function ClassExamsPage() {
	const router = useRouter();
	const { classId } = router.query;

	const [classData, setClassData] = useState<Class | null>(null);
	const [exams, setExams] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!classId) return;
		const load = async () => {
			setLoading(true);
			try {
				const [allClasses, examsResp] = await Promise.all([
					classesApi.getAll(),
					api.get(`/exams/class/${classId}`),
				]);
				const cls = allClasses.find((c) => c.id === Number(classId));
				setClassData(cls || null);
				setExams(examsResp.data || []);
			} catch (err) {
				console.error(err);
				toast.error("Gagal memuat data kelas");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [classId]);

	const handleOpenExam = (examId: number) => {
		router.push(`/results/class/${classId}/exam/${examId}`);
	};

	if (loading) {
		return (
			<Layout title="Hasil Kelas">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Memuat...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title={classData ? `Hasil - ${classData.name}` : "Hasil Kelas"}>
			<Head>
				<title>Hasil Ujian Kelas</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="mb-6">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
						Hasil Ujian Kelas
					</h1>
					{classData && (
						<div className="text-gray-600 mt-2">
							{classData.name} - {classData.major}
						</div>
					)}
				</div>

				<div className="mb-6">
					<Link href="/results" className="btn">
						Kembali ke Hasil
					</Link>
				</div>

				<div className="card">
					<h2 className="text-xl font-bold mb-4">Daftar Ujian</h2>
					{exams.length === 0 ? (
						<p className="text-gray-600">Belum ada ujian untuk kelas ini.</p>
					) : (
						<div className="space-y-3">
							{exams.map((exam) => (
								<div
									key={exam.id}
									className="p-4 border rounded-md flex items-center justify-between hover:bg-gray-50"
								>
									<div>
										<div className="font-medium">{exam.title}</div>
										<div className="text-sm text-gray-600">
											Durasi: {exam.duration} menit
										</div>
									</div>
									<button
										className="btn"
										onClick={() => handleOpenExam(exam.id)}
									>
										Lihat Hasil
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
