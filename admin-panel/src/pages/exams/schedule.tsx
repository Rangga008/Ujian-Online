import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";
import {
	format,
	startOfMonth,
	endOfMonth,
	addMonths,
	subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import semestersApi, { Semester } from "@/lib/semestersApi";

interface ExamSchedule {
	id: number;
	title: string;
	description: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: string;
	totalQuestions: number;
	totalScore: number;
	targetType: "class" | "grade";
	class?: {
		id: number;
		name: string;
		grade: string;
		major: string;
	};
	grade?: string;
	subject?: {
		id: number;
		name: string;
		code: string;
	};
	semester: {
		id: number;
		name: string;
		year: string;
	};
}

export default function ExamSchedulePage() {
	const [exams, setExams] = useState<ExamSchedule[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [viewMode, setViewMode] = useState<"calendar" | "list">("list");

	useEffect(() => {
		fetchInitialData();
	}, []);

	useEffect(() => {
		fetchSchedule();
	}, [currentMonth, selectedSemesterId]);

	const fetchInitialData = async () => {
		try {
			const [active, allSemesters] = await Promise.all([
				semestersApi.getActive().catch(() => null),
				semestersApi.getAll(),
			]);
			setActiveSemester(active);
			setSemesters(allSemesters);
			if (active) {
				setSelectedSemesterId(active.id);
			}
		} catch (error) {
			toast.error("Gagal memuat data");
		}
	};

	const fetchSchedule = async () => {
		try {
			setLoading(true);
			const params: any = {
				startDate: format(startOfMonth(currentMonth), "yyyy-MM-dd"),
				endDate: format(endOfMonth(currentMonth), "yyyy-MM-dd"),
			};

			if (selectedSemesterId !== "all") {
				params.semesterId = selectedSemesterId;
			}

			const response = await api.get("/exams/schedule", { params });
			setExams(response.data);
		} catch (error) {
			toast.error("Gagal memuat jadwal ujian");
		} finally {
			setLoading(false);
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

	const getTargetLabel = (exam: ExamSchedule) => {
		if (exam.targetType === "class" && exam.class) {
			return `${exam.class.name} - ${exam.class.major}`;
		} else if (exam.targetType === "grade" && exam.grade) {
			return `Kelas ${exam.grade}`;
		}
		return "Tidak ada target";
	};

	const groupExamsByDate = () => {
		const grouped: { [key: string]: ExamSchedule[] } = {};
		exams.forEach((exam) => {
			const date = format(new Date(exam.startTime), "yyyy-MM-dd");
			if (!grouped[date]) {
				grouped[date] = [];
			}
			grouped[date].push(exam);
		});
		return grouped;
	};

	const renderCalendarView = () => {
		const groupedExams = groupExamsByDate();
		const daysInMonth = Array.from(
			{ length: endOfMonth(currentMonth).getDate() },
			(_, i) => i + 1
		);

		return (
			<div className="grid grid-cols-7 gap-2">
				{["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
					<div key={day} className="text-center font-bold p-2 bg-gray-100">
						{day}
					</div>
				))}
				{daysInMonth.map((day) => {
					const date = new Date(
						currentMonth.getFullYear(),
						currentMonth.getMonth(),
						day
					);
					const dateStr = format(date, "yyyy-MM-dd");
					const dayExams = groupedExams[dateStr] || [];

					return (
						<div
							key={day}
							className="border rounded p-2 min-h-[100px] hover:bg-gray-50"
						>
							<div className="font-bold text-sm mb-1">{day}</div>
							{dayExams.map((exam) => (
								<Link
									key={exam.id}
									href={`/exams/${exam.id}`}
									className="block text-xs p-1 mb-1 rounded bg-blue-100 hover:bg-blue-200 truncate"
									title={exam.title}
								>
									{format(new Date(exam.startTime), "HH:mm")} - {exam.title}
								</Link>
							))}
						</div>
					);
				})}
			</div>
		);
	};

	const renderListView = () => {
		const groupedExams = groupExamsByDate();
		const sortedDates = Object.keys(groupedExams).sort();

		return (
			<div className="space-y-6">
				{sortedDates.map((date) => (
					<div key={date} className="card">
						<h3 className="text-lg font-bold mb-4 pb-2 border-b">
							{format(new Date(date), "EEEE, dd MMMM yyyy", {
								locale: idLocale,
							})}
						</h3>
						<div className="space-y-4">
							{groupedExams[date].map((exam) => (
								<div
									key={exam.id}
									className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
								>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h4 className="font-bold text-gray-900">{exam.title}</h4>
											<span
												className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
													exam.status
												)}`}
											>
												{exam.status}
											</span>
										</div>
										<div className="text-sm text-gray-600 space-y-1">
											<p>
												⏰ {format(new Date(exam.startTime), "HH:mm")} -{" "}
												{format(new Date(exam.endTime), "HH:mm")} (
												{exam.duration} menit)
											</p>
											<p>🎯 {getTargetLabel(exam)}</p>
											{exam.subject && (
												<p>
													📚 {exam.subject.name} ({exam.subject.code})
												</p>
											)}
											<p>
												📝 {exam.totalQuestions} soal | 🎯 {exam.totalScore}{" "}
												poin
											</p>
										</div>
									</div>
									<div className="flex gap-2">
										<Link
											href={`/exams/${exam.id}`}
											className="btn btn-secondary text-sm"
										>
											Detail
										</Link>
										<Link
											href={`/exams/${exam.id}/edit`}
											className="btn btn-primary text-sm"
										>
											Edit
										</Link>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
				{sortedDates.length === 0 && (
					<div className="card text-center py-12 text-gray-500">
						Tidak ada ujian pada bulan ini
					</div>
				)}
			</div>
		);
	};

	return (
		<Layout>
			<div>
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Jadwal Ujian</h1>
						<p className="text-gray-600 mt-2">
							Lihat jadwal ujian berdasarkan kalender
						</p>
					</div>
					<Link href="/exams/create" className="btn btn-primary">
						+ Buat Ujian Baru
					</Link>
				</div>

				{/* Filters and Navigation */}
				<div className="card mb-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4">
							<button
								onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
								className="btn btn-secondary"
							>
								← Bulan Sebelumnya
							</button>
							<h2 className="text-xl font-bold">
								{format(currentMonth, "MMMM yyyy", { locale: idLocale })}
							</h2>
							<button
								onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
								className="btn btn-secondary"
							>
								Bulan Berikutnya →
							</button>
							<button
								onClick={() => setCurrentMonth(new Date())}
								className="btn btn-secondary"
							>
								Hari Ini
							</button>
						</div>

						<div className="flex items-center gap-4">
							<select
								value={selectedSemesterId}
								onChange={(e) =>
									setSelectedSemesterId(
										e.target.value === "all" ? "all" : Number(e.target.value)
									)
								}
								className="input"
							>
								<option value="all">Semua Semester</option>
								{semesters.map((sem) => (
									<option key={sem.id} value={sem.id}>
										{sem.name} - {sem.year}
									</option>
								))}
							</select>

							<div className="flex rounded-lg border overflow-hidden">
								<button
									onClick={() => setViewMode("list")}
									className={`px-4 py-2 text-sm ${
										viewMode === "list"
											? "bg-blue-600 text-white"
											: "bg-white text-gray-700 hover:bg-gray-50"
									}`}
								>
									📋 List
								</button>
								<button
									onClick={() => setViewMode("calendar")}
									className={`px-4 py-2 text-sm border-l ${
										viewMode === "calendar"
											? "bg-blue-600 text-white"
											: "bg-white text-gray-700 hover:bg-gray-50"
									}`}
								>
									📅 Kalender
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Content */}
				{loading ? (
					<div className="flex items-center justify-center h-64">
						<div className="text-xl">Loading...</div>
					</div>
				) : viewMode === "calendar" ? (
					<div className="card">{renderCalendarView()}</div>
				) : (
					renderListView()
				)}

				{/* Summary */}
				{!loading && exams.length > 0 && (
					<div className="card mt-6">
						<h3 className="font-bold mb-2">Ringkasan</h3>
						<div className="grid grid-cols-4 gap-4 text-center">
							<div>
								<div className="text-2xl font-bold text-blue-600">
									{exams.length}
								</div>
								<div className="text-sm text-gray-600">Total Ujian</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-green-600">
									{exams.filter((e) => e.status === "published").length}
								</div>
								<div className="text-sm text-gray-600">Published</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-yellow-600">
									{exams.filter((e) => e.status === "draft").length}
								</div>
								<div className="text-sm text-gray-600">Draft</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-red-600">
									{exams.filter((e) => e.status === "closed").length}
								</div>
								<div className="text-sm text-gray-600">Closed</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
