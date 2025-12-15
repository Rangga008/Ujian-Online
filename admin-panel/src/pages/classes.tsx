import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import Pagination from "@/components/Pagination";
import { classesApi } from "@/lib/classesApi";
import { semestersApi } from "@/lib/semestersApi";
import gradesApi, { Grade } from "@/lib/gradesApi";
import { api } from "@/lib/api";
import subjectsApi from "@/lib/subjectsApi";
import { useAuthStore } from "@/store/authStore";

interface Class {
	id: number;
	name: string;
	grade: number;
	gradeId?: number; // Added
	major: string;
	academicYear: string;
	description?: string;
	capacity?: number;
	isActive: boolean;
	semesterId?: number;
	semester?: {
		id: number;
		name: string;
		year: string;
		type: string;
	};
	students?: any[];
	teachers?: any[];
	subjects?: any[];
}

interface Semester {
	id: number;
	name: string;
	year: string;
	type: string;
	isActive: boolean;
}

export default function ClassesPage() {
	const router = useRouter();
	const { user } = useAuthStore();
	const [classes, setClasses] = useState<Class[]>([]);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [grades, setGrades] = useState<Grade[]>([]);
	const [subjects, setSubjects] = useState<any[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | "all">(
		"all"
	);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingClass, setEditingClass] = useState<Class | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [formData, setFormData] = useState({
		name: "",
		gradeId: 0,
		subjectIds: [] as number[],
		major: "",
		academicYear: "",
		description: "",
		capacity: 30,
		isActive: true,
		semesterId: 0,
	});

	// Searchable dropdown state for subjects
	const [subjectQuery, setSubjectQuery] = useState<string>("");
	const [subjectDropdownOpen, setSubjectDropdownOpen] =
		useState<boolean>(false);

	useEffect(() => {
		fetchData();
	}, []);

	// Refetch classes when semester filter changes
	useEffect(() => {
		const refetch = async () => {
			try {
				setLoading(true);
				let res;
				if (selectedSemesterId === "all") {
					res = await api.get("/classes");
				} else if (activeSemester && selectedSemesterId === activeSemester.id) {
					// Use optimized active semester endpoint
					res = await api.get("/classes/active-semester");
				} else {
					res = await api.get("/classes", {
						params: { semesterId: selectedSemesterId },
					});
				}
				// Filter for teachers
				const filteredData =
					user?.role === "teacher" &&
					user?.teachingClasses &&
					user.teachingClasses.length > 0
						? res.data.filter((c: Class) =>
								user.teachingClasses!.some((tc: any) => tc.id === c.id)
						  )
						: res.data;
				setClasses(filteredData);
			} catch (e) {
				console.error("Error refetching classes:", e);
			} finally {
				setLoading(false);
			}
		};

		if (activeSemester !== null) {
			refetch();
		}
	}, [selectedSemesterId, activeSemester]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [semestersData, activeData, gradesData, subjectsData] =
				await Promise.all([
					semestersApi.getAll(),
					semestersApi.getActive().catch(() => null),
					gradesApi.getAll(),
					subjectsApi.getAll(),
				]);

			setSemesters(semestersData);
			setActiveSemester(activeData);
			setGrades(gradesData.sort((a, b) => a.level - b.level));
			setSubjects(subjectsData || []);

			// Set filter to active semester by default
			const defaultSemesterId = activeData ? activeData.id : "all";
			setSelectedSemesterId(defaultSemesterId);

			// Fetch classes from active semester
			let classesData;
			if (activeData) {
				const res = await api.get("/classes/active-semester");
				classesData = res.data;
			} else {
				classesData = await classesApi.getAll();
			}
			// Filter for teachers - only show their assigned class
			const filteredClasses =
				user?.role === "teacher" &&
				user?.teachingClasses &&
				user.teachingClasses.length > 0
					? classesData.filter((c: Class) =>
							user.teachingClasses!.some((tc: any) => tc.id === c.id)
					  )
					: classesData;
			setClasses(filteredClasses);
		} catch (error) {
			console.error("Error fetching data:", error);
			alert("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	};

	const toAcademicYearNumber = (year: string) => {
		// Extract first year from "2024/2025" format
		if (!year) return NaN;
		const match = year.match(/^\d{4}/);
		return match ? Number(match[0]) : NaN;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const selectedGrade = grades.find((g) => g.id === formData.gradeId);
		if (!selectedGrade) {
			alert("Angkatan tidak valid");
			return;
		}

		// When editing, use the existing semesterId if not changed
		let semesterToUse = formData.semesterId;
		if (!semesterToUse && editingClass) {
			semesterToUse = editingClass.semesterId || 0;
		}

		// Determine academic year value
		let academicYearValue: number;

		// If editing and no semester ID, use the existing academicYear from the class
		if (editingClass && (!semesterToUse || semesterToUse === 0)) {
			if (typeof editingClass.academicYear === "number") {
				academicYearValue = editingClass.academicYear;
			} else {
				academicYearValue = Number(editingClass.academicYear);
			}
		} else {
			// For new class or when semester is selected, get it from semester
			const selectedSemester =
				semesters.find((s) => s.id === semesterToUse) || activeSemester;
			if (!selectedSemester) {
				alert("Semester tidak valid");
				return;
			}
			academicYearValue = toAcademicYearNumber(selectedSemester.year);
		}

		// Validate academicYear is a valid number
		if (isNaN(academicYearValue)) {
			alert("Tahun akademik tidak valid");
			return;
		}

		try {
			const payload = {
				name: formData.name,
				grade: selectedGrade.level,
				gradeId: formData.gradeId,
				major:
					formData.subjectIds && formData.subjectIds.length > 0
						? subjects
								.filter((s) => formData.subjectIds.includes(s.id))
								.map((s) => s.name)
								.join(", ")
						: formData.major,
				academicYear: academicYearValue,
				semesterId: semesterToUse || activeSemester?.id,
				capacity: formData.capacity ? Number(formData.capacity) : undefined,
				isActive: formData.isActive,
				subjectIds: formData.subjectIds,
			} as any;

			if (editingClass) {
				await api.patch(`/classes/${editingClass.id}`, payload);
			} else {
				await api.post("/classes", payload);
			}

			setShowModal(false);
			resetForm();
			fetchData();
		} catch (error: any) {
			console.error("Error saving class:", error);
			alert(error.response?.data?.message || "Gagal menyimpan kelas");
		}
	};

	const handleEdit = (cls: Class) => {
		console.log("Editing class:", cls); // DEBUG
		console.log("Setting gradeId to:", cls.gradeId); // DEBUG
		setEditingClass(cls);
		setFormData({
			name: cls.name,
			gradeId: cls.gradeId || 0,
			subjectIds: (cls.subjects || []).map((s: any) => s.id),
			major: cls.major,
			academicYear: cls.academicYear,
			description: cls.description || "",
			capacity: cls.capacity || 30,
			isActive: cls.isActive,
			semesterId: cls.semesterId || 0,
		});
		setShowModal(true);
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Yakin ingin menghapus kelas ini?")) return;

		try {
			await api.delete(`/classes/${id}`);
			fetchData();
		} catch (error: any) {
			console.error("Error deleting class:", error);
			alert(error.response?.data?.message || "Gagal menghapus kelas");
		}
	};

	const resetForm = () => {
		setEditingClass(null);
		setFormData({
			name: "",
			gradeId: 0,
			subjectIds: [],
			major: "",
			academicYear: "",
			description: "",
			capacity: 30,
			isActive: true,
			semesterId: activeSemester?.id || 0,
		});
	};

	const handleOpenModal = () => {
		resetForm();
		setShowModal(true);
	};

	const allFilteredClasses = classes
		.filter((cls) =>
			selectedSemesterId === "all"
				? true
				: cls.semesterId === selectedSemesterId
		)
		.filter((cls) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return (
				cls.name.toLowerCase().includes(query) ||
				cls.major.toLowerCase().includes(query) ||
				String(cls.grade).includes(query)
			);
		});

	const totalPages = Math.ceil(allFilteredClasses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedClasses = allFilteredClasses.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleItemsPerPageChange = (newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1);
	};

	return (
		<Layout title="Kelola Kelas">
			<Head>
				<title>Kelola Kelas - Admin Panel</title>
			</Head>
			<div className="space-y-6 px-2 sm:px-0">
				<div className="mb-2">
					<ActiveSemesterBanner />
				</div>
				{/* Header */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
							Manajemen Kelas
						</h1>
						<p className="text-gray-600 mt-1">
							Kelola data kelas dan tingkatan siswa
						</p>
						{activeSemester && (
							<p className="text-sm text-blue-600 mt-2">
								📅 Semester Aktif: {activeSemester.name} ({activeSemester.year})
							</p>
						)}
					</div>
					<button onClick={handleOpenModal} className="btn btn-primary">
						+ Tambah Kelas
					</button>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="card">
						<div className="text-sm text-gray-600">Total Kelas</div>
						<div className="text-2xl font-bold text-gray-900 mt-1">
							{classes.length}
						</div>
					</div>
					<div className="card">
						<div className="text-sm text-gray-600">Kelas Aktif</div>
						<div className="text-2xl font-bold text-green-600 mt-1">
							{classes.filter((c) => c.isActive).length}
						</div>
					</div>
					<div className="card">
						<div className="text-sm text-gray-600">Total Siswa</div>
						<div className="text-2xl font-bold text-blue-600 mt-1">
							{classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)}
						</div>
					</div>
				</div>

				{/* Filters: Search and Semester */}
				<div className="flex gap-4 items-end mb-4">
					<div className="flex-1">
						<label className="block text-sm font-medium mb-2">
							Cari Kelas:
						</label>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Cari nama kelas, jurusan, atau tingkat..."
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
				</div>

				{/* Classes List */}
				<div className="card">
					{loading ? (
						<div className="text-center py-8 text-gray-500">Loading...</div>
					) : classes.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							Belum ada kelas. Klik tombol "Tambah Kelas" untuk mulai.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>Nama Kelas</th>
										<th>Tingkat</th>
										<th>Tahun Ajaran</th>
										<th>Semester</th>
										<th>Kapasitas</th>
										<th>Siswa</th>
										<th>Status</th>
										<th>Aksi</th>
									</tr>
								</thead>
								<tbody>
									{paginatedClasses.map((cls) => (
										<tr key={cls.id}>
											<td className="font-medium">{cls.name}</td>
											<td>Kelas {cls.grade}</td>
											{/* subjects column removed to avoid visual clutter */}
											<td>{cls.academicYear}</td>
											<td>
												{cls.semester ? (
													<span className="text-sm text-gray-600">
														{cls.semester.name}
													</span>
												) : (
													"-"
												)}
											</td>
											<td>{cls.capacity || "-"}</td>
											<td>{cls.students?.length || 0}</td>
											<td>
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														cls.isActive
															? "bg-green-100 text-green-800"
															: "bg-gray-100 text-gray-800"
													}`}
												>
													{cls.isActive ? "Aktif" : "Nonaktif"}
												</span>
											</td>
											<td>
												<div className="flex gap-2 flex-wrap">
													<button
														onClick={() => router.push(`/classes/${cls.id}`)}
														className="btn btn-primary btn-sm"
													>
														Detail
													</button>
													<button
														onClick={() => handleEdit(cls)}
														className="btn btn-secondary btn-sm"
													>
														Edit
													</button>
													<button
														onClick={() => handleDelete(cls.id)}
														className="btn btn-danger btn-sm"
													>
														Hapus
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						totalItems={allFilteredClasses.length}
						onPageChange={handlePageChange}
						onItemsPerPageChange={handleItemsPerPageChange}
					/>
				</div>
			</div>

			{/* Modal */}
			{showModal && (
				<div className="modal-overlay" onClick={() => setShowModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="text-xl font-bold">
								{editingClass ? "Edit Kelas" : "Tambah Kelas"}
							</h2>
							<button
								onClick={() => setShowModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleSubmit}>
							<div className="modal-body">
								<div className="grid grid-cols-2 gap-4">
									<div className="form-group">
										<label className="form-label">Nama Kelas *</label>
										<input
											type="text"
											className="form-input"
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											placeholder="Contoh: X IPA 1"
											required
										/>
									</div>
									<div className="form-group">
										<label className="form-label">Angkatan (Tingkat) *</label>
										<select
											className="form-input"
											value={formData.gradeId}
											onChange={(e) =>
												setFormData({
													...formData,
													gradeId: parseInt(e.target.value),
												})
											}
											required
										>
											<option value={0}>Pilih Angkatan</option>
											{grades
												.filter((g) => g.section === "SMA" && g.isActive)
												.map((grade) => (
													<option key={grade.id} value={grade.id}>
														{grade.name} (Kelas {grade.level})
													</option>
												))}
										</select>
										<p className="text-xs text-gray-500 mt-1">
											Pilih angkatan dari data yang sudah dikelola di Pengaturan
										</p>
									</div>
									<div className="form-group">
										<label className="form-label">Mata Pelajaran *</label>
										<div className="relative">
											<input
												type="text"
												className="form-input"
												placeholder="Cari dan pilih mata pelajaran..."
												value={subjectQuery}
												onChange={(e) => {
													setSubjectQuery(e.target.value);
													setSubjectDropdownOpen(true);
												}}
												onFocus={() => setSubjectDropdownOpen(true)}
												onBlur={() =>
													setTimeout(() => setSubjectDropdownOpen(false), 150)
												}
											/>

											<div className="mt-2 text-xs text-gray-500">
												Pilih satu atau lebih mata pelajaran
											</div>

											{subjectDropdownOpen && (
												<div className="absolute z-50 w-full bg-white border rounded max-h-48 overflow-auto mt-1 shadow">
													{subjects.filter((s) =>
														s.name
															.toString()
															.toLowerCase()
															.includes(subjectQuery.toLowerCase())
													).length === 0 ? (
														<div className="p-2 text-sm text-gray-500">
															Tidak ditemukan
														</div>
													) : (
														subjects
															.filter((s) =>
																s.name
																	.toString()
																	.toLowerCase()
																	.includes(subjectQuery.toLowerCase())
															)
															.map((sub) => (
																<label
																	key={sub.id}
																	className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
																>
																	<input
																		type="checkbox"
																		checked={formData.subjectIds.includes(
																			sub.id
																		)}
																		onChange={() => {
																			const ids = formData.subjectIds || [];
																			if (ids.includes(sub.id)) {
																				setFormData({
																					...formData,
																					subjectIds: ids.filter(
																						(i) => i !== sub.id
																					),
																				});
																			} else {
																				setFormData({
																					...formData,
																					subjectIds: [...ids, sub.id],
																				});
																			}
																		}}
																	/>
																	<span className="truncate">{sub.name}</span>
																</label>
															))
													)}
												</div>
											)}

											{/* Display selected summary */}
											<div className="mt-2 text-sm text-gray-700">
												{formData.subjectIds && formData.subjectIds.length > 0
													? subjects
															.filter((s) => formData.subjectIds.includes(s.id))
															.map((s) => s.name)
															.join(", ")
													: "Belum ada mata pelajaran dipilih"}
											</div>
										</div>
									</div>
									<div className="form-group">
										<label className="form-label">Semester *</label>
										<select
											className="form-input"
											value={formData.semesterId}
											onChange={(e) =>
												setFormData({
													...formData,
													semesterId: parseInt(e.target.value),
												})
											}
											required
										>
											<option value={0}>Pilih Semester</option>
											{semesters.map((sem) => (
												<option key={sem.id} value={sem.id}>
													{sem.name} - {sem.year}
												</option>
											))}
										</select>
										<p className="text-xs text-gray-500 mt-1">
											Tahun ajaran akan diambil dari semester yang dipilih
										</p>
									</div>
									<div className="form-group">
										<label className="form-label">Kapasitas Siswa</label>
										<input
											type="number"
											className="form-input"
											value={formData.capacity}
											onChange={(e) =>
												setFormData({
													...formData,
													capacity: parseInt(e.target.value),
												})
											}
											min={1}
										/>
									</div>
								</div>

								<div className="form-group mt-4">
									<label className="form-label">Deskripsi</label>
									<textarea
										className="form-input"
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										rows={3}
										placeholder="Deskripsi kelas (opsional)"
									/>
								</div>

								<div className="form-group mt-4">
									<label className="flex items-center gap-2">
										<input
											type="checkbox"
											checked={formData.isActive}
											onChange={(e) =>
												setFormData({ ...formData, isActive: e.target.checked })
											}
											className="w-4 h-4 text-blue-600"
										/>
										<span className="text-sm text-gray-700">Kelas Aktif</span>
									</label>
								</div>
							</div>

							<div className="modal-footer">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="btn btn-secondary"
								>
									Batal
								</button>
								<button type="submit" className="btn btn-primary">
									{editingClass ? "Simpan Perubahan" : "Tambah Kelas"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</Layout>
	);
}
