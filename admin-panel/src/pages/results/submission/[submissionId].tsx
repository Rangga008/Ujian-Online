import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function SubmissionDetailPage() {
	const router = useRouter();
	const { submissionId } = router.query;

	const [submission, setSubmission] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [answersState, setAnswersState] = useState<Record<number, number>>({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!submissionId) return;
		const load = async () => {
			setLoading(true);
			try {
				const resp = await api.get(`/submissions/${submissionId}`);
				setSubmission(resp.data);
				const map: Record<number, number> = {};
				(resp.data.answers || []).forEach(
					(a: any) => (map[a.id] = a.points || 0)
				);
				setAnswersState(map);
			} catch (err) {
				console.error(err);
				toast.error("Gagal memuat data pengerjaan");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [submissionId]);

	const updatePoint = (answerId: number, value: number) => {
		setAnswersState((s) => ({ ...s, [answerId]: value }));
	};

	const handleSave = async () => {
		if (!submission) return;
		setSaving(true);
		try {
			const payload = {
				answers: Object.keys(answersState).map((k) => ({
					id: Number(k),
					points: Number(answersState[Number(k)]),
				})),
			};
			await api.post(`/submissions/${submission.id}/grade`, payload);
			toast.success("Perubahan tersimpan");
			// reload
			const resp = await api.get(`/submissions/${submission.id}`);
			setSubmission(resp.data);
		} catch (err) {
			console.error(err);
			toast.error("Gagal menyimpan nilai");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Layout title="Detail Pengerjaan">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Memuat...</div>
				</div>
			</Layout>
		);
	}

	if (!submission) {
		return (
			<Layout title="Detail Pengerjaan">
				<div className="px-2 sm:px-0">
					<ActiveSemesterBanner />
					<div className="card">Data tidak ditemukan</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title={`Pengerjaan - ${submission.user?.name || submission.id}`}>
			<Head>
				<title>Detail Pengerjaan</title>
			</Head>

			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="card mb-6">
					<h1 className="text-2xl font-bold">Detail Pengerjaan</h1>
					<div className="mt-2 text-sm text-gray-700">
						Siswa: {submission.user?.name} ({submission.user?.nis})
					</div>
					<div className="mt-1 text-sm text-gray-700">
						Status: {submission.status}
					</div>
					<div className="mt-1 text-sm text-gray-700">
						Nilai: {submission.score ?? "-"}
					</div>
				</div>

				<div className="card">
					<h2 className="text-xl font-bold mb-4">Jawaban</h2>
					{(submission.answers || []).map((a: any) => (
						<div key={a.id} className="mb-4 border-b pb-4">
							<div className="font-medium">
								Soal #{a.question?.orderIndex ?? a.questionId}
							</div>
							<div className="text-sm text-gray-700 mt-1">
								{a.question?.questionText}
							</div>
							{a.question?.imageUrl && (
								<img
									src={a.question.imageUrl}
									alt="soal"
									className="mt-2 max-w-xs"
								/>
							)}
							<div className="mt-2">
								<div className="text-sm text-gray-600">Jawaban siswa:</div>
								<div className="p-3 bg-gray-50 rounded mt-1">
									{a.answer || "-"}
								</div>
							</div>

							<div className="mt-3 flex items-center space-x-3">
								<label className="text-sm">Nilai (points):</label>
								<input
									type="number"
									className="input w-32"
									value={answersState[a.id] ?? 0}
									onChange={(e) => updatePoint(a.id, Number(e.target.value))}
								/>
								<div className="text-sm text-gray-600">
									Max: {a.question?.points ?? "-"}
								</div>
							</div>
						</div>
					))}

					<div className="mt-6 flex items-center space-x-2">
						<button className="btn" onClick={handleSave} disabled={saving}>
							{saving ? "Menyimpan..." : "Simpan Penilaian"}
						</button>
						<button
							className="btn-secondary"
							onClick={() => router.back()}
							disabled={saving}
						>
							Kembali
						</button>
					</div>
				</div>
			</div>
		</Layout>
	);
}
