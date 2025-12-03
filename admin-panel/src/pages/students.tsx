import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

export default function StudentsPage() {
	const [students, setStudents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [classes, setClasses] = useState<Class[]>([]);
	const [selectedClass, setSelectedClass] = useState<string>("all");
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		nis: "",
		password: "",
		classId: "",
	});

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
			// Load classes (will be filtered client-side by semester)
			const classesData = await classesApi.getAll();
			setClasses(classesData);
			await fetchStudents();
		} catch (error) {
			toast.error("Gagal memuat data");
		}
	};

	const fetchStudents = async () => {
		try {
			// Use with-active-student endpoint to get proper student data
			const response = await api.get("/users/with-active-student", {
				params: { role: "student" },
			});
			// Transform response to match expected structure
			const studentsData = response.data.map((item: any) => ({
				...item.user,
				activeStudent: item.student,
				class: item.class,
				// For backward compatibility
				semesterId: item.student?.semesterId,
				classId: item.student?.classId,
			}));
			setStudents(studentsData);
		} catch (error) {
			toast.error("Gagal memuat data siswa");
		} finally {
			setLoading(false);
		}
	};

	const filteredByClass =
		selectedClass === "all"
			? students
			: students.filter((s) => s.classId === parseInt(selectedClass));

	const filteredStudents =
		selectedSemesterId === "all"
			? filteredByClass
			: filteredByClass.filter((s) => s.semesterId === selectedSemesterId);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/users", {
				...formData,
				role: "student",
			});
			toast.success("Siswa berhasil ditambahkan");
			setShowModal(false);
			setFormData({
				name: "",
				email: "",
				nis: "",
				password: "",
				classId: "",
			});
			fetchStudents();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menambahkan siswa");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Yakin ingin menghapus siswa ini?")) return;

		try {
			await api.delete(`/users/${id}`);
			toast.success("Siswa berhasil dihapus");
			fetchStudents();
		} catch (error) {
			toast.error("Gagal menghapus siswa");
		}
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
				{/* Active semester banner (default size) */}
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Kelola Siswa</h1>
						{activeSemester ? (
							<p className="text-gray-600 mt-2">
								Semester {activeSemester.type === "ganjil" ? "Ganjil" : "Genap"}{" "}
								{activeSemester.year}
							</p>
						) : (
							<p className="text-gray-600 mt-2">Tidak ada semester aktif</p>
						)}
					</div>
					<button
						onClick={() => setShowModal(true)}
						className="btn btn-primary"
					>
						+ Tambah Siswa
					</button>
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

				<div className="card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="text-left p-4">NIS</th>
									<th className="text-left p-4">Nama</th>
									<th className="text-left p-4">Email</th>
									<th className="text-left p-4">Kelas</th>
									<th className="text-left p-4">Status</th>
									<th className="text-left p-4">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{filteredStudents.map((student) => {
									const studentClass = classes.find(
										(c) => c.id === student.classId
									);
									return (
										<tr key={student.id} className="border-b hover:bg-gray-50">
											<td className="p-4">{student.nis}</td>
											<td className="p-4 font-medium">{student.name}</td>
											<td className="p-4">{student.email}</td>
											<td className="p-4">
												{studentClass
													? `${studentClass.name} - ${studentClass.major}`
													: "-"}
											</td>
											<td className="p-4">
												<span
													className={`px-3 py-1 rounded-full text-sm ${
														student.isActive
															? "bg-green-100 text-green-800"
															: "bg-red-100 text-red-800"
													}`}
												>
													{student.isActive ? "Aktif" : "Nonaktif"}
												</span>
											</td>
											<td className="p-4">
												<button
													onClick={() => handleDelete(student.id)}
													className="text-red-600 hover:text-red-700"
												>
													Hapus
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>

				{/* Modal Add Student */}
				{showModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-8 max-w-md w-full">
							<h2 className="text-2xl font-bold mb-6">Tambah Siswa Baru</h2>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">Nama</label>
									<input
										type="text"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="input"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">
										Email
									</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										className="input"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">NIS</label>
									<input
										type="text"
										value={formData.nis}
										onChange={(e) =>
											setFormData({ ...formData, nis: e.target.value })
										}
										className="input"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">
										Password
									</label>
									<input
										type="password"
										value={formData.password}
										onChange={(e) =>
											setFormData({ ...formData, password: e.target.value })
										}
										className="input"
										required
										minLength={6}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">
										Kelas
									</label>
									<select
										value={formData.classId}
										onChange={(e) =>
											setFormData({ ...formData, classId: e.target.value })
										}
										className="input"
									>
										<option value="">Pilih Kelas</option>
										{classes.map((cls) => (
											<option key={cls.id} value={cls.id}>
												{cls.name} - {cls.major}
											</option>
										))}
									</select>
								</div>
								<div className="flex gap-3 pt-4">
									<button type="submit" className="btn btn-primary flex-1">
										Simpan
									</button>
									<button
										type="button"
										onClick={() => setShowModal(false)}
										className="btn btn-secondary flex-1"
									>
										Batal
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
