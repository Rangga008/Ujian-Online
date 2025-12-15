import { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
	const [stats, setStats] = useState({
		totalExams: 0,
		activeExams: 0,
		totalStudents: 0,
		totalSubmissions: 0,
	});
	const [recentExams, setRecentExams] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			const [examsRes, studentsRes] = await Promise.all([
				api.get("/exams"),
				api.get("/users?role=student"),
			]);

			const exams = examsRes.data;
			const students = studentsRes.data;

			const activeExams = exams.filter((e: any) => e.status === "published");

			setStats({
				totalExams: exams.length,
				activeExams: activeExams.length,
				totalStudents: students.length,
				totalSubmissions: 0, // Could be fetched from API
			});

			setRecentExams(exams.slice(0, 5));
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const statCards = [
		{
			label: "Total Ujian",
			value: stats.totalExams,
			icon: "📝",
			color: "bg-blue-500",
		},
		{
			label: "Ujian Aktif",
			value: stats.activeExams,
			icon: "✅",
			color: "bg-green-500",
		},
		{
			label: "Total Siswa",
			value: stats.totalStudents,
			icon: "👥",
			color: "bg-purple-500",
		},
		{
			label: "Total Pengerjaan",
			value: stats.totalSubmissions,
			icon: "📊",
			color: "bg-orange-500",
		},
	];

	if (loading) {
		return (
			<Layout title="Dashboard">
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Dashboard">
			<Head>
				<title>Dashboard - Admin Panel</title>
			</Head>
			<div className="px-2 sm:px-0">
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
					Dashboard
				</h1>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
					{statCards.map((stat) => (
						<div key={stat.label} className="card">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-gray-600 text-sm mb-1">{stat.label}</p>
									<p className="text-3xl font-bold text-gray-900">
										{stat.value}
									</p>
								</div>
								<div
									className={`${stat.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl`}
								>
									{stat.icon}
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Recent Exams */}
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">Ujian Terbaru</h2>
						<Link
							href="/exams"
							className="text-primary-600 hover:text-primary-700 font-medium"
						>
							Lihat Semua →
						</Link>
					</div>

					{recentExams.length === 0 ? (
						<p className="text-gray-600 text-center py-8">Belum ada ujian</p>
					) : (
						<div className="space-y-4">
							{recentExams.map((exam) => (
								<div
									key={exam.id}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
								>
									<div>
										<h3 className="font-semibold text-gray-900">
											{exam.title}
										</h3>
										<p className="text-sm text-gray-600 mt-1">
											Durasi: {exam.duration} menit | Status: {exam.status}
										</p>
									</div>
									<Link href={`/exams/${exam.id}`} className="btn btn-primary">
										Detail
									</Link>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
