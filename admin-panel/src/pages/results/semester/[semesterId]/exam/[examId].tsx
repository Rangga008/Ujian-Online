import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import classesApi, { Class } from "@/lib/classesApi";

export default function ExamPerClassPage() {
	const router = useRouter();
	const { semesterId, examId } = router.query;

	const [classes, setClasses] = useState<Class[]>([]);
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedClassId, setSelectedClassId] = useState<number | "all">(
		(router.query.classId as any) || "all"
	);

	useEffect(() => {
		if (!examId || !semesterId) return;
		const init = async () => {
			setLoading(true);
			try {
				const allClasses = await classesApi.getAll();
				setClasses(
					allClasses.filter((c) => c.semesterId === Number(semesterId))
				);

				const resp = await api.get(`/submissions/exam/${examId}`);
				setSubmissions(resp.data || []);
			} catch (err) {
				console.error(err);
				toast.error("Gagal memuat data ujian");
			} finally {
				setLoading(false);
			}
		};
		init();
	}, [examId, semesterId]);

	const classCounts = useMemo(() => {
		const m: Record<number, number> = {};
		submissions.forEach((s) => {
			const cid = s.user?.classId ?? s.classId ?? null;
			if (!cid) return;
			m[cid] = (m[cid] || 0) + 1;
		});
		return m;
	}, [submissions]);

	const filtered = useMemo(() => {
		if (selectedClassId === "all") return submissions;
		return submissions.filter(
			(s) => (s.user?.classId ?? s.classId ?? null) === selectedClassId
		);
	}, [submissions, selectedClassId]);

	if (loading) {
		return (
			<Layout title="Hasil Ujian per Kelas">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Memuat...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Hasil Ujian per Kelas">
			<Head>
				<title>Hasil Ujian - Per Kelas</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="mb-6">
					<h1 className="text-2xl font-bold">Hasil Ujian</h1>
					<div className="text-sm text-gray-600">Ujian: {examId}</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<div className="card">
						<label className="block text-sm font-medium mb-2">
							Pilih Kelas
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
									{c.name} - {c.major} ({classCounts[c.id] || 0})
								</option>
							))}
						</select>
					</div>

					<div className="card col-span-2">
						<label className="block text-sm font-medium mb-2">Aksi</label>
						<div className="flex space-x-2">
							<Link href={`/results/semester/${semesterId}`}>
								<a className="btn">Kembali ke Semester</a>
							</Link>
						</div>
					</div>
				</div>

				<div className="card">
					<h2 className="text-xl font-bold mb-4">Daftar Siswa</h2>
					{filtered.length === 0 ? (
						<p className="text-gray-600">
							Tidak ada data untuk kelas terpilih.
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b">
										<th className="text-left p-4">Nama</th>
										<th className="text-left p-4">NIS</th>
										<th className="text-left p-4">Status</th>
										<th className="text-left p-4">Nilai</th>
										<th className="text-left p-4">Soal Dijawab</th>
										<th className="text-left p-4">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((s) => (
										<tr key={s.id} className="border-b hover:bg-gray-50">
											<td className="p-4 font-medium">{s.user?.name || "-"}</td>
											<td className="p-4">{s.user?.nis || "-"}</td>
											<td className="p-4">{s.status}</td>
											<td className="p-4 font-bold text-primary-600">
												{s.score ?? "-"}
											</td>
											<td className="p-4">{s.totalAnswered || 0}</td>
											<td className="p-4">
												<Link href={`/results/submission/${s.id}`}>
													<a className="btn">Lihat Detail</a>
												</Link>
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
