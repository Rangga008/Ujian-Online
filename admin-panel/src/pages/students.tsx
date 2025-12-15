import { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";
import { useAuthStore } from "@/store/authStore";

export default function StudentsPage() {
	const { user } = useAuthStore();
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
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [showImportModal, setShowImportModal] = useState(false);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importClassId, setImportClassId] = useState<string>("");
	const [importing, setImporting] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
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

	useEffect(() => {
		if (!loading) {
			fetchStudents();
		}
	}, [selectedSemesterId]);

	const fetchInitialData = async () => {
		try {
			const [active, allSemesters] = await Promise.all([
				semestersApi.getActive().catch(() => null),
				semestersApi.getAll(),
			]);
			setActiveSemester(active);
			setSemesters(allSemesters);
			const initialSemesterId = active ? active.id : "all";
			setSelectedSemesterId(initialSemesterId);
			// Load classes (will be filtered client-side by semester)
			const classesData = await classesApi.getAll();
			// Filter classes if user is teacher
			const filteredClasses =
				user?.role === "teacher" &&
				user?.teachingClasses &&
				user.teachingClasses.length > 0
					? classesData.filter((c) =>
							user.teachingClasses!.some((tc: any) => tc.id === c.id)
					  )
					: classesData;
			setClasses(filteredClasses);
			// Fetch students with the correct initial semester
			const params: any = {};
			if (initialSemesterId !== "all") {
				params.semesterId = initialSemesterId;
			}
			const response = await api.get("/students", { params });
			setStudents(response.data);
		} catch (error) {
			toast.error("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	};

	const fetchStudents = async () => {
		try {
			// Get all students for selected semester
			const params: any = {};
			if (selectedSemesterId !== "all") {
				params.semesterId = selectedSemesterId;
			}
			const response = await api.get("/students", { params });
			setStudents(response.data);
		} catch (error) {
			toast.error("Gagal memuat data siswa");
		} finally {
			setLoading(false);
		}
	};

	const allFilteredStudents = students
		.filter((student) => {
			// If teacher, only show students from their assigned class
			if (
				user?.role === "teacher" &&
				user?.teachingClasses &&
				user.teachingClasses.length > 0
			) {
				const teacherClassIds = user.teachingClasses.map((tc: any) => tc.id);
				if (!student.class || !teacherClassIds.includes(student.class.id)) {
					return false;
				}
			}
			// Apply class filter
			return selectedClass === "all"
				? true
				: student.class?.id.toString() === selectedClass;
		})
		.filter((student) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return (
				student.name.toLowerCase().includes(query) ||
				student.user?.email.toLowerCase().includes(query) ||
				(student.user?.nis && student.user.nis.toLowerCase().includes(query))
			);
		});

	const totalPages = Math.ceil(allFilteredStudents.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedStudents = allFilteredStudents.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleItemsPerPageChange = (newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeSemester) {
			toast.error("Tidak ada semester aktif");
			return;
		}
		try {
			// Create user first
			const userResponse = await api.post("/users", {
				name: formData.name,
				email: formData.email,
				nis: formData.nis,
				password: formData.password,
				role: "student",
			});

			// Then assign to class if selected
			if (formData.classId) {
				// Find the student record that was auto-created for active semester
				const studentsResponse = await api.get(
					`/students/user/${userResponse.data.id}`
				);
				const activeStudent = studentsResponse.data.find(
					(s: any) => s.semesterId === activeSemester.id
				);
				if (activeStudent) {
					await api.patch(`/students/${activeStudent.id}/assign-class`, {
						classId: parseInt(formData.classId),
					});
				}
			}

			toast.success("Siswa berhasil ditambahkan ke semester aktif");
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

	const handleDelete = async (studentId: number) => {
		if (
			!confirm(
				"Yakin ingin menghapus siswa dari semester ini? Data ujian dan nilai akan ikut terhapus."
			)
		)
			return;

		try {
			await api.delete(`/students/${studentId}`);
			toast.success("Siswa berhasil dihapus dari semester");
			fetchStudents();
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || "Gagal menghapus siswa dari semester"
			);
		}
	};

	const handleDownloadTemplate = async () => {
		try {
			const response = await api.get("/students/download-template", {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "template-import-siswa.xlsx");
			document.body.appendChild(link);
			link.click();
			link.remove();
			toast.success("Template berhasil diunduh");
		} catch (error) {
			toast.error("Gagal mengunduh template");
		}
	};

	const handleImportStudents = async () => {
		if (!importFile) {
			toast.error("Pilih file Excel terlebih dahulu");
			return;
		}

		if (!activeSemester) {
			toast.error("Tidak ada semester aktif");
			return;
		}

		try {
			setImporting(true);
			const formData = new FormData();
			formData.append("file", importFile);
			formData.append("semesterId", activeSemester.id.toString());
			if (importClassId) {
				formData.append("classId", importClassId);
			}

			const response = await api.post("/students/import", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			const result = response.data;
			const {
				success,
				skipped,
				failed,
				newUsers = 0,
				existingUsers = 0,
				errors = [],
				warnings = [],
			} = result;

			let message = `Import selesai:\n- Berhasil: ${success} siswa\n- User baru: ${newUsers}\n- User existing: ${existingUsers}\n- Dilewati: ${skipped}\n- Gagal: ${failed}`;

			if (warnings.length > 0) {
				message += `\n\n⚠️ Peringatan:\n${warnings.slice(0, 3).join("\n")}`;
				if (warnings.length > 3) {
					message += `\n... dan ${warnings.length - 3} peringatan lainnya`;
				}
			}

			if (errors.length > 0) {
				message += `\n\n❌ Error:\n${errors.slice(0, 3).join("\n")}`;
				if (errors.length > 3) {
					message += `\n... dan ${errors.length - 3} error lainnya`;
				}
			}

			if (failed > 0 || errors.length > 0) {
				toast.error(message, { duration: 8000 });
			} else if (warnings.length > 0) {
				toast(message, {
					duration: 6000,
					icon: "⚠️",
					style: {
						borderLeft: "4px solid #f59e0b",
					},
				});
			} else {
				toast.success(message);
			}

			setShowImportModal(false);
			setImportFile(null);
			setImportClassId("");
			await fetchStudents();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal import siswa");
		} finally {
			setImporting(false);
		}
	};

	if (loading) {
		return (
			<Layout title="Kelola Siswa">
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Kelola Siswa">
			<Head>
				<title>Kelola Siswa - Admin Panel</title>
			</Head>
			<div className="px-2 sm:px-0">
				{/* Active semester banner (default size) */}
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
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
					<div className="flex gap-2">
						<button
							onClick={() => setShowImportModal(true)}
							className="btn btn-secondary"
							disabled={!activeSemester}
						>
							📥 Import Siswa
						</button>
						<button
							onClick={() => {
								if (!activeSemester) {
									toast.error(
										"Tidak ada semester aktif. Aktifkan semester terlebih dahulu."
									);
									return;
								}
								setShowModal(true);
							}}
							className="btn btn-primary"
							disabled={!activeSemester}
						>
							+ Tambah Siswa
						</button>
					</div>
				</div>

				{/* Filters: Search, Semester and Class */}
				<div className="mb-6 flex gap-4 items-end">
					<div className="flex-1">
						<label className="block text-sm font-medium mb-2">
							Cari Siswa:
						</label>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Cari nama, email, atau NIS..."
							className="input"
						/>
					</div>
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
									<th className="text-left p-4">Semester</th>
									<th className="text-left p-4">Kelas</th>
									<th className="text-left p-4">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{paginatedStudents.map((student) => {
									const studentClass = classes.find(
										(c) => c.id === student.classId
									);
									return (
										<tr key={student.id} className="border-b hover:bg-gray-50">
											<td className="p-4">{student.user?.nis || "-"}</td>
											<td className="p-4 font-medium">
												{student.user?.name || student.name}
											</td>
											<td className="p-4">{student.user?.email || "-"}</td>
											<td className="p-4">
												{student.semester ? (
													<span>
														{student.semester.name} - {student.semester.year}
														{student.semester.isActive && (
															<span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
																AKTIF
															</span>
														)}
													</span>
												) : (
													"-"
												)}
											</td>
											<td className="p-4">
												{studentClass
													? `${studentClass.name} - ${studentClass.major}`
													: "-"}
											</td>
											<td className="p-4">
												<div className="flex gap-2">
													<button
														onClick={() =>
															(window.location.href = `/students/${student.userId}`)
														}
														className="text-blue-600 hover:text-blue-700"
													>
														Detail
													</button>
													<button
														onClick={() => handleDelete(student.id)}
														className="text-red-600 hover:text-red-700"
													>
														Hapus
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						totalItems={allFilteredStudents.length}
						onPageChange={handlePageChange}
						onItemsPerPageChange={handleItemsPerPageChange}
					/>
				</div>

				{/* Modal Add Student */}
				{showModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-8 max-w-md w-full">
							<h2 className="text-2xl font-bold mb-2">Tambah Siswa Baru</h2>
							{activeSemester && (
								<p className="text-sm text-gray-600 mb-4">
									Siswa akan ditambahkan ke semester:{" "}
									<span className="font-semibold">
										{activeSemester.name} - {activeSemester.year}
									</span>
								</p>
							)}
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
										Kelas (Opsional)
									</label>
									<select
										value={formData.classId}
										onChange={(e) =>
											setFormData({ ...formData, classId: e.target.value })
										}
										className="input"
									>
										<option value="">Belum ada kelas</option>
										{classes
											.filter((cls) => cls.semesterId === activeSemester?.id)
											.map((cls) => (
												<option key={cls.id} value={cls.id}>
													{cls.name} - {cls.major}
												</option>
											))}
									</select>
									<p className="text-xs text-gray-500 mt-1">
										Hanya menampilkan kelas di semester aktif
									</p>
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

				{/* Modal Import Siswa */}
				{showImportModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-8 max-w-md w-full">
							<h2 className="text-2xl font-bold mb-2">
								Import Siswa dari Excel
							</h2>
							{activeSemester && (
								<p className="text-sm text-gray-600 mb-4">
									Siswa akan ditambahkan ke semester:{" "}
									<span className="font-semibold">
										{activeSemester.name} - {activeSemester.year}
									</span>
								</p>
							)}

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">
										1. Download Template Excel
									</label>
									<button
										type="button"
										onClick={handleDownloadTemplate}
										className="btn btn-secondary w-full"
									>
										📥 Download Template
									</button>
									<p className="text-xs text-gray-500 mt-1">
										Template berisi kolom: Nama, Email, NIS, Password
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										2. Upload File Excel
									</label>
									<input
										type="file"
										accept=".xlsx,.xls"
										onChange={(e) => setImportFile(e.target.files?.[0] || null)}
										className="input"
									/>
									{importFile && (
										<p className="text-xs text-green-600 mt-1">
											✓ File terpilih: {importFile.name}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										3. Kelas (Opsional)
									</label>
									<select
										value={importClassId}
										onChange={(e) => setImportClassId(e.target.value)}
										className="input"
									>
										<option value="">Tanpa kelas</option>
										{classes
											.filter((cls) => cls.semesterId === activeSemester?.id)
											.map((cls) => (
												<option key={cls.id} value={cls.id}>
													{cls.name} - {cls.major}
												</option>
											))}
									</select>
									<p className="text-xs text-gray-500 mt-1">
										Semua siswa yang diimport akan masuk ke kelas yang dipilih
									</p>
								</div>

								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
									<p className="font-semibold mb-1">ℹ️ Informasi Penting:</p>
									<ul className="list-disc list-inside space-y-1 text-xs">
										<li>Siswa dengan NIS atau Email yang sama akan dilewati</li>
										<li>Password akan di-hash otomatis oleh sistem</li>
										<li>File maksimal 5MB</li>
									</ul>
								</div>
							</div>

							<div className="flex gap-3 pt-6">
								<button
									onClick={handleImportStudents}
									className="btn btn-primary flex-1"
									disabled={!importFile || importing}
								>
									{importing ? "Mengimport..." : "Import Siswa"}
								</button>
								<button
									onClick={() => {
										setShowImportModal(false);
										setImportFile(null);
										setImportClassId("");
									}}
									className="btn btn-secondary flex-1"
									disabled={importing}
								>
									Batal
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
