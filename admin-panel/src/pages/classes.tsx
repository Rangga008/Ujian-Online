import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import Pagination from "@/components/Pagination";
import { classesApi } from "@/lib/classesApi";
import { semestersApi } from "@/lib/semestersApi";
import { api } from "@/lib/api";

interface Class {
	id: number;
	name: string;
	grade: number;
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
	const [classes, setClasses] = useState<Class[]>([]);
	const [semesters, setSemesters] = useState<Semester[]>([]);
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
		grade: 10,
		major: "",
		academicYear: "",
		description: "",
		capacity: 30,
		isActive: true,
		semesterId: 0,
	});

	useEffect(() => {
		fetchData();
	}, []);

	// Refetch classes when semester filter changes (server-side param if available)
	useEffect(() => {
		const refetch = async () => {
			try {
				setLoading(true);
				const params: Record<string, any> = {};
				if (selectedSemesterId !== "all") {
					params.semesterId = selectedSemesterId;
				}
				const res = await api.get("/classes", { params });
				setClasses(res.data);
			} catch (e) {
				// fallback: keep existing
			} finally {
				setLoading(false);
			}
		};

		refetch();
	}, [selectedSemesterId]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [classesData, semestersData, activeData] = await Promise.all([
				classesApi.getAll(),
				semestersApi.getAll(),
				semestersApi.getActive().catch(() => null),
			]);

			setClasses(classesData);
			setSemesters(semestersData);
			setActiveSemester(activeData);
			setSelectedSemesterId(activeData ? activeData.id : "all");
		} catch (error) {
			console.error("Error fetching data:", error);
			alert("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	};

	const toAcademicYearNumber = (v: string | number, fallback?: number) => {
		if (typeof v === "number" && Number.isFinite(v)) return v;
		const match = String(v).match(/\d{4}(?!.*\d{4})/); // pick last 4-digit year (e.g., 2025 from 2024/2025)
		const n = match ? parseInt(match[0], 10) : NaN;
		return Number.isFinite(n) ? n : fallback ?? new Date().getFullYear();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.semesterId || formData.semesterId === 0) {
			alert("Silakan pilih semester terlebih dahulu");
			return;
		}

		const selectedSemester = semesters.find(
			(s) => s.id === formData.semesterId
		);
		if (!selectedSemester) {
			alert("Semester tidak valid");
			return;
		}

		try {
			const payload = {
				name: formData.name,
				grade: Number(formData.grade),
				major: formData.major,
				academicYear: toAcademicYearNumber(selectedSemester.year),
				semesterId: formData.semesterId,
				capacity: formData.capacity ? Number(formData.capacity) : undefined,
				isActive: formData.isActive,
			} as any;

			console.log("Payload to send:", payload); // Debug log

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
		setEditingClass(cls);
		setFormData({
			name: cls.name,
			grade: cls.grade,
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
			grade: 10,
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
		<Layout>
			<div className="space-y-6">
				<div className="mb-2">
					<ActiveSemesterBanner />
				</div>
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
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
										<th>Jurusan</th>
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
											<td>{cls.major}</td>
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
												<div className="flex gap-2">
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
										<label className="form-label">Tingkat *</label>
										<select
											className="form-input"
											value={formData.grade}
											onChange={(e) =>
												setFormData({
													...formData,
													grade: parseInt(e.target.value),
												})
											}
											required
										>
											<option value={10}>Kelas 10</option>
											<option value={11}>Kelas 11</option>
											<option value={12}>Kelas 12</option>
										</select>
									</div>
									<div className="form-group">
										<label className="form-label">Jurusan *</label>
										<input
											type="text"
											className="form-input"
											value={formData.major}
											onChange={(e) =>
												setFormData({ ...formData, major: e.target.value })
											}
											placeholder="Contoh: IPA, IPS"
											required
										/>
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
