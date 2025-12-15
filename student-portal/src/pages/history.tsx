import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/imageUrl";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Submission {
	id: string | number;
	exam?: {
		id: string | number;
		title?: string;
		showResultImmediately?: boolean;
		imageUrl?: string;
	};
	status?: string;
	score?: number | null;
	totalAnswered?: number;
	submittedAt?: string | null;
}

export default function HistoryPage() {
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchHistory();
	}, []);

	const fetchHistory = async () => {
		try {
			const res = await api.get("/submissions/my-submissions");
			setSubmissions(res.data || []);
		} catch (error) {
			toast.error("Gagal memuat riwayat ujian");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<Layout>
				<div className="min-h-[50vh] flex items-center justify-center">
					<div className="animate-pulse text-lg text-gray-600">
						Memuat riwayat...
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-lg">
					<h1 className="text-3xl font-bold">Riwayat Ujian</h1>
					<p className="mt-2 text-purple-100">
						Lihat semua ujian yang telah Anda kerjakan.
					</p>
				</div>

				{submissions.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-md">
						<p className="text-gray-600 text-lg">Belum ada riwayat ujian.</p>
						<p className="text-sm text-gray-500 mt-2">
							Riwayat ujian akan muncul setelah Anda menyelesaikan ujian.
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{submissions.map((submission) => {
							const status = submission.status ?? "draft";
							const statusLabel =
								status === "submitted"
									? "Selesai"
									: status === "in_progress"
									? "Sedang dikerjakan"
									: "Draft";
							const statusColor =
								status === "submitted"
									? "bg-emerald-100 text-emerald-700"
									: status === "in_progress"
									? "bg-blue-100 text-blue-700"
									: "bg-gray-100 text-gray-700";

							return (
								<div
									key={submission.id}
									className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition p-5"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1">
											{submission.exam?.imageUrl && (
												<img
													src={getImageUrl(submission.exam.imageUrl)}
													alt={submission.exam?.title || "Ujian"}
													className="w-16 h-12 object-cover rounded-md mr-3 inline-block"
												/>
											)}
											<h3 className="font-bold text-gray-900 text-lg">
												{submission.exam?.title || "Ujian"}
											</h3>
											<p className="text-sm text-gray-600 mt-1">
												{submission.submittedAt
													? format(
															new Date(submission.submittedAt),
															"dd MMM yyyy HH:mm"
													  )
													: "Belum dikumpulkan"}
											</p>
										</div>
										<span
											className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${statusColor}`}
										>
											{statusLabel}
										</span>
									</div>

									{/* If exam allows immediate result, show score/answered; otherwise just show taken indicator */}
									{submission.exam?.showResultImmediately ? (
										<div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3">
											<div className="text-center p-2 bg-blue-50 rounded-lg">
												<p className="text-xs text-gray-600 font-medium">
													Nilai
												</p>
												<p className="text-xl font-bold text-blue-600 mt-1">
													{submission.score ?? "-"}
												</p>
											</div>
											<div className="text-center p-2 bg-gray-100 rounded-lg">
												<p className="text-xs text-gray-600 font-medium">
													Terjawab
												</p>
												<p className="text-xl font-bold text-gray-700 mt-1">
													{submission.totalAnswered ?? 0}
												</p>
											</div>
										</div>
									) : (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<p className="text-sm text-gray-600">
												Ujian sudah dikerjakan — hasil disembunyikan
											</p>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</Layout>
	);
}
