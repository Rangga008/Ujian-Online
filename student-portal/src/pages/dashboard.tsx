import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface ActiveExam {
	id: string | number;
	title: string;
	description?: string;
	duration?: number;
	totalQuestions?: number;
	totalScore?: number;
	startTime: string;
	endTime: string;
}

interface Submission {
	id: string | number;
	exam?: { id: string | number; title?: string };
	status?: string;
	score?: number | null;
	totalAnswered?: number;
	submittedAt?: string | null;
}

export default function DashboardPage() {
	const { isAuthenticated, isChecking } = useAuthGuard();
	const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
	const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Only fetch data if authenticated and auth checking is done
		if (isAuthenticated && !isChecking) {
			fetchData();
		}
	}, [isAuthenticated, isChecking]);

	const fetchData = async () => {
		try {
			const [examsRes, submissionsRes] = await Promise.all([
				api.get("/exams/active"),
				api.get("/submissions/my-submissions"),
			]);

			setActiveExams(examsRes.data || []);
			setMySubmissions(submissionsRes.data || []);
		} catch (error) {
			toast.error("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	};

	const nextExam = useMemo(() => {
		return [...activeExams].sort(
			(a, b) =>
				new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		)[0];
	}, [activeExams]);

	const submittedCount = useMemo(
		() => mySubmissions.filter((s) => s.status === "submitted").length,
		[mySubmissions]
	);

	// removed average score and recent submissions per request

	const renderDateRange = (start: string, end: string) => {
		const startDate = format(new Date(start), "dd MMM yyyy HH:mm");
		const endDate = format(new Date(end), "HH:mm");
		return `${startDate} - ${endDate}`;
	};

	// Show loading while checking auth
	if (isChecking || loading) {
		return (
			<Layout>
				<div className="min-h-[70vh] flex items-center justify-center">
					<div className="animate-pulse text-lg text-gray-600">
						Memuat dashboard...
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-8">
				<section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_40%)]" />
					<div className="absolute inset-y-0 right-[-10%] w-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_55%)]" />
					<div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
						<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<p className="text-sm uppercase tracking-[0.2em] text-blue-100">
									ANBK Style
								</p>
								<h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
									Dashboard Ujian
								</h1>
								<p className="mt-3 max-w-2xl text-blue-100">
									Pantau ujian aktif, lanjutkan pengerjaan, dan lihat progres
									nilai Anda secara cepat dan ringkas.
								</p>
								{nextExam ? (
									<div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">
										<span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
										<span>{nextExam.title}</span>
										<span className="text-blue-100">
											{renderDateRange(nextExam.startTime, nextExam.endTime)}
										</span>
									</div>
								) : (
									<div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-blue-100 backdrop-blur">
										Tidak ada jadwal ujian aktif saat ini
									</div>
								)}
							</div>
							<div className="grid w-full max-w-xl grid-cols-2 gap-4">
								<StatCard label="Ujian aktif" value={activeExams.length} />
								<StatCard label="Ujian selesai" value={submittedCount} />
							</div>
						</div>
					</div>
				</section>

				<section className="space-y-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold text-gray-900">
									Ujian Tersedia
								</h2>
								<p className="text-sm text-gray-500">
									Mulai atau lanjutkan ujian yang sedang aktif.
								</p>
							</div>
							<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
								{activeExams.length} ujian
							</span>
						</div>

						{activeExams.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
								<p className="text-gray-600">Belum ada ujian yang tersedia.</p>
								<p className="text-sm text-gray-500">
									Tunggu jadwal berikutnya dari guru/administrator.
								</p>
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2">
								{activeExams.map((exam) => {
									const hasSubmission = mySubmissions.find(
										(s) => s.exam?.id === exam.id && s.status !== "submitted"
									);

									return (
										<div
											key={exam.id}
											className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-indigo-50 opacity-0 transition group-hover:opacity-100" />
											<div className="relative flex h-full flex-col gap-3 p-5">
												<div className="flex items-start justify-between gap-3">
													<div className="space-y-1">
														<h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
															{exam.title}
														</h3>
														<p className="text-sm text-gray-600 line-clamp-2">
															{exam.description || "Tidak ada deskripsi."}
														</p>
													</div>
													<div className="flex flex-col items-end gap-1 text-xs text-gray-500 text-right">
														<span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
															{exam.duration ?? "-"} menit
														</span>
														<span className="text-gray-500 leading-tight">
															{renderDateRange(exam.startTime, exam.endTime)}
														</span>
													</div>
												</div>

												<div className="flex flex-wrap gap-3 text-sm text-gray-600">
													<Badge>📝 {exam.totalQuestions ?? "-"} soal</Badge>
													<Badge>🎯 {exam.totalScore ?? "-"} poin</Badge>
												</div>

												<div className="mt-auto flex items-center justify-between pt-2">
													<div className="text-xs text-gray-500">
														{hasSubmission
															? "Sedang berlangsung"
															: "Belum dikerjakan"}
													</div>
													<Link href={`/exam/${exam.id}`} legacyBehavior>
														<a className="btn btn-primary px-4 py-2 text-sm">
															{hasSubmission ? "Lanjutkan" : "Lihat Detail"}
														</a>
													</Link>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</section>
			</div>
		</Layout>
	);
}

function StatCard({
	label,
	value,
}: {
	label: string;
	value: string | number | null;
}) {
	return (
		<div className="relative overflow-hidden rounded-2xl bg-white/10 p-4 text-white shadow-md backdrop-blur transition hover:bg-white/20">
			<div className="text-xs uppercase tracking-wide text-blue-100">
				{label}
			</div>
			<div className="mt-1 text-2xl font-semibold">{value}</div>
		</div>
	);
}

function Badge({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
			{children}
		</span>
	);
}
