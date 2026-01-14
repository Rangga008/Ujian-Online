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
import { useAuthStore } from "@/store/authStore";

export default function ResultsPage() {
	const router = useRouter();
	const { user } = useAuthStore();
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [classes, setClasses] = useState<Class[]>([]);
	const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
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

				// Filter classes berdasarkan role user
				let classesToShow = allClasses;
				if (user && user.role === "teacher" && user.teachingClasses) {
					// Guru hanya bisa melihat hasil ujian dari kelas yang dia ampuh
					const teachingClassIds = user.teachingClasses.map((tc) => tc.id);
					classesToShow = allClasses.filter((c) =>
						teachingClassIds.includes(c.id)
					);
				}

				setClasses(classesToShow);
			} catch (e) {
				toast.error("Gagal memuat data awal");
			} finally {
				setLoading(false);
			}
		};
		init();
	}, [user]);

	useEffect(() => {
		// Filter classes by selected semester
		if (selectedSemesterId === "all") {
			setFilteredClasses(classes);
		} else {
			setFilteredClasses(
				classes.filter((c) => c.semesterId === selectedSemesterId)
			);
		}
		setSelectedClassId("all");
	}, [selectedSemesterId, classes]);

	const handleOpenClass = (classId: number) => {
		router.push(`/results/class/${classId}`);
	};

	// Determine which classes to display based on filter
	const displayClasses =
		selectedClassId === "all"
			? filteredClasses
			: filteredClasses.filter((c) => c.id === Number(selectedClassId));

	if (loading) {
		return (
			<Layout title="Hasil Ujian">
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Hasil Ujian">
			<Head>
				<title>Hasil Ujian - Admin Panel</title>
			</Head>
			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
					Hasil Ujian
				</h1>

				{/* Filter: Semester and Class */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
						<label className="block text-sm font-medium mb-2">
							Kelas (Opsional)
						</label>
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
							{filteredClasses.map((cls) => (
								<option key={cls.id} value={cls.id}>
									{cls.name} - {cls.major}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Kelas list */}
				<div className="card">
					<h2 className="text-xl font-bold mb-4">Daftar Kelas</h2>
					{filteredClasses.length === 0 ? (
						<p className="text-gray-600 text-center py-8">
							Tidak ada kelas untuk semester ini.
						</p>
					) : (
						<div className="space-y-3">
							{displayClasses.map((cls) => (
								<div
									key={cls.id}
									className="p-4 border rounded-md flex items-center justify-between hover:bg-gray-50"
								>
									<div>
										<div className="font-medium">{cls.name}</div>
										<div className="text-sm text-gray-600">{cls.major}</div>
									</div>
									<button
										className="btn"
										onClick={() => handleOpenClass(cls.id)}
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
