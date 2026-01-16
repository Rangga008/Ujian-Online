import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import { isPageAccessible } from "@/lib/authGuard";
import { semestersApi } from "@/lib/semestersApi";
import { api } from "@/lib/api";

interface Semester {
	id: number;
	name: string;
	year: string;
	type: "ganjil" | "genap";
	startDate?: string;
	endDate?: string;
	description?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	exams?: any[];
}

export default function SemestersPage() {
	const router = useRouter();
	const { user } = useAuthStore();

	useEffect(() => {
		if (user && !isPageAccessible("/semesters", user.role)) {
			router.push("/dashboard");
		}
	}, [user, router]);

	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
	const [confirmModal, setConfirmModal] = useState<{
		isOpen: boolean;
		action: "delete" | "activate" | "deactivate" | null;
		semesterId: number | null;
	}>({ isOpen: false, action: null, semesterId: null });
	const [formData, setFormData] = useState({
		name: "",
		year: new Date().getFullYear().toString(),
		type: "ganjil" as "ganjil" | "genap",
		startDate: "",
		endDate: "",
		description: "",
		isActive: false,
	});

	useEffect(() => {
		fetchSemesters();
	}, []);

	const fetchSemesters = async () => {
		try {
			setLoading(true);
			const data = await semestersApi.getAll();
			setSemesters(data);
		} catch (error) {
			console.error("Error fetching semesters:", error);
			alert("Gagal memuat data semester");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			if (editingSemester) {
				await api.patch(`/semesters/${editingSemester.id}`, formData);
			} else {
				await api.post("/semesters", formData);
			}

			setShowModal(false);
			resetForm();
			fetchSemesters();
		} catch (error: any) {
			console.error("Error saving semester:", error);
			alert(error.response?.data?.message || "Gagal menyimpan semester");
		}
	};

	const handleEdit = (semester: Semester) => {
		setEditingSemester(semester);
		setFormData({
			name: semester.name,
			year: semester.year,
			type: semester.type,
			startDate: semester.startDate
				? new Date(semester.startDate).toISOString().split("T")[0]
				: "",
			endDate: semester.endDate
				? new Date(semester.endDate).toISOString().split("T")[0]
				: "",
			description: semester.description || "",
			isActive: semester.isActive,
		});
		setShowModal(true);
	};

	const handleDelete = (id: number) => {
		setConfirmModal({ isOpen: true, action: "delete", semesterId: id });
	};

	const handleActivate = (id: number) => {
		setConfirmModal({ isOpen: true, action: "activate", semesterId: id });
	};

	const handleDeactivate = (id: number) => {
		setConfirmModal({ isOpen: true, action: "deactivate", semesterId: id });
	};

	const executeConfirmation = async () => {
		if (!confirmModal.semesterId || !confirmModal.action) return;

		try {
			if (confirmModal.action === "delete") {
				await api.delete(`/semesters/${confirmModal.semesterId}`);
			} else if (confirmModal.action === "activate") {
				await semestersApi.setActive(confirmModal.semesterId);
			} else if (confirmModal.action === "deactivate") {
				await api.patch(`/semesters/${confirmModal.semesterId}`, {
					isActive: false,
				});
			}
			fetchSemesters();
			setConfirmModal({ isOpen: false, action: null, semesterId: null });
		} catch (error: any) {
			console.error("Error executing confirmation:", error);
			alert(error.response?.data?.message || "Gagal melakukan operasi");
		}
	};

	const resetForm = () => {
		setEditingSemester(null);
		setFormData({
			name: "",
			year: new Date().getFullYear().toString(),
			type: "ganjil",
			startDate: "",
			endDate: "",
			description: "",
			isActive: false,
		});
	};

	const handleOpenModal = () => {
		resetForm();
		setShowModal(true);
	};

	const activeSemester = semesters.find((s) => s.isActive);

	return (
		<Layout title="Tahun Ajaran">
			<Head>
				<title>Tahun Ajaran & Semester - Admin Panel</title>
			</Head>
			<div className="space-y-6 px-2 sm:px-0">
				{/* Header */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
							Tahun Ajaran & Semester
						</h1>
						<p className="text-gray-600 mt-1">
							Kelola tahun ajaran dan semester aktif
						</p>
						{activeSemester && (
							<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
								<p className="text-sm font-medium text-blue-800">
									📅 Semester Aktif Saat Ini
								</p>
								<p className="text-lg font-bold text-blue-900 mt-1">
									{activeSemester.name}
								</p>
								<p className="text-xs text-blue-600 mt-1">
									Siswa dan ujian baru akan otomatis masuk ke semester aktif
								</p>
							</div>
						)}
					</div>
					<button onClick={handleOpenModal} className="btn btn-primary">
						+ Tambah Semester
					</button>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="card">
						<div className="text-sm text-gray-600">Total Semester</div>
						<div className="text-2xl font-bold text-gray-900 mt-1">
							{semesters.length}
						</div>
					</div>
					<div className="card">
						<div className="text-sm text-gray-600">Semester Ganjil</div>
						<div className="text-2xl font-bold text-purple-600 mt-1">
							{semesters.filter((s) => s.type === "ganjil").length}
						</div>
					</div>
					<div className="card">
						<div className="text-sm text-gray-600">Semester Genap</div>
						<div className="text-2xl font-bold text-green-600 mt-1">
							{semesters.filter((s) => s.type === "genap").length}
						</div>
					</div>
				</div>

				{/* Semesters List */}
				<div className="card">
					{loading ? (
						<div className="text-center py-8 text-gray-500">Loading...</div>
					) : semesters.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							Belum ada semester. Klik tombol "Tambah Semester" untuk mulai.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>Nama Semester</th>
										<th>Tahun</th>
										<th>Tipe</th>
										<th>Periode</th>
										<th>Status</th>
										<th>Ujian</th>
										<th>Aksi</th>
									</tr>
								</thead>
								<tbody>
									{semesters.map((semester) => (
										<tr
											key={semester.id}
											className={semester.isActive ? "bg-blue-50" : ""}
										>
											<td className="font-medium">
												{semester.name}
												{semester.isActive && (
													<span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
														AKTIF
													</span>
												)}
											</td>
											<td>{semester.year}</td>
											<td>
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														semester.type === "ganjil"
															? "bg-purple-100 text-purple-800"
															: "bg-green-100 text-green-800"
													}`}
												>
													{semester.type === "ganjil" ? "Ganjil" : "Genap"}
												</span>
											</td>
											<td className="text-sm text-gray-600">
												{semester.startDate && semester.endDate ? (
													<>
														{new Date(semester.startDate).toLocaleDateString(
															"id-ID"
														)}{" "}
														-{" "}
														{new Date(semester.endDate).toLocaleDateString(
															"id-ID"
														)}
													</>
												) : (
													"-"
												)}
											</td>
											<td>
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														semester.isActive
															? "bg-green-100 text-green-800"
															: "bg-gray-100 text-gray-800"
													}`}
												>
													{semester.isActive ? "Aktif" : "Nonaktif"}
												</span>
											</td>
											<td>{semester.exams?.length || 0}</td>
											<td>
												<div className="flex gap-2">
													{!semester.isActive && (
														<button
															onClick={() => handleActivate(semester.id)}
															className="btn btn-success btn-sm"
															title="Aktifkan Semester"
														>
															Aktifkan
														</button>
													)}
													{semester.isActive && (
														<button
															onClick={() => handleDeactivate(semester.id)}
															className="btn btn-warning btn-sm"
															title="Nonaktifkan Semester"
														>
															Nonaktifkan
														</button>
													)}
													<button
														onClick={() => handleEdit(semester)}
														className="btn btn-secondary btn-sm"
													>
														Edit
													</button>
													<button
														onClick={() => handleDelete(semester.id)}
														className="btn btn-danger btn-sm"
														disabled={semester.isActive}
														title={
															semester.isActive
																? "Tidak bisa hapus semester aktif"
																: "Hapus"
														}
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
				</div>
			</div>

			{/* Modal */}
			{showModal && (
				<div className="modal-overlay" onClick={() => setShowModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="text-xl font-bold">
								{editingSemester ? "Edit Semester" : "Tambah Semester"}
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
									<div className="form-group col-span-2">
										<label className="form-label">Nama Semester *</label>
										<input
											type="text"
											className="form-input"
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											placeholder="Contoh: Semester 1"
											required
										/>
									</div>

									<div className="form-group">
										<label className="form-label">Tahun Ajaran *</label>
										<input
											type="text"
											className="form-input"
											value={formData.year}
											onChange={(e) =>
												setFormData({ ...formData, year: e.target.value })
											}
											placeholder="Contoh: 2024/2025"
											required
										/>
									</div>

									<div className="form-group">
										<label className="form-label">Tipe Semester *</label>
										<select
											className="form-input"
											value={formData.type}
											onChange={(e) =>
												setFormData({
													...formData,
													type: e.target.value as "ganjil" | "genap",
												})
											}
											required
										>
											<option value="ganjil">Ganjil</option>
											<option value="genap">Genap</option>
										</select>
									</div>

									<div className="form-group">
										<label className="form-label">Tanggal Mulai</label>
										<input
											type="date"
											className="form-input"
											value={formData.startDate}
											onChange={(e) =>
												setFormData({ ...formData, startDate: e.target.value })
											}
										/>
									</div>

									<div className="form-group">
										<label className="form-label">Tanggal Selesai</label>
										<input
											type="date"
											className="form-input"
											value={formData.endDate}
											onChange={(e) =>
												setFormData({ ...formData, endDate: e.target.value })
											}
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
										placeholder="Deskripsi semester (opsional)"
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
										<span className="text-sm text-gray-700">
											Jadikan Semester Aktif
										</span>
									</label>
									<p className="text-xs text-gray-500 mt-1 ml-6">
										Hanya satu semester yang bisa aktif. Semester aktif akan
										otomatis dipilih saat membuat siswa atau ujian baru.
									</p>
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
									{editingSemester ? "Simpan Perubahan" : "Tambah Semester"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
			<ConfirmationModal
				isOpen={confirmModal.isOpen}
				title={
					confirmModal.action === "delete"
						? "Hapus Semester"
						: confirmModal.action === "activate"
						? "Aktifkan Semester"
						: "Nonaktifkan Semester"
				}
				message={
					confirmModal.action === "delete"
						? "Yakin ingin menghapus semester ini?"
						: confirmModal.action === "activate"
						? "Yakin ingin mengaktifkan semester ini? Semester lain akan dinonaktifkan."
						: "Yakin ingin menonaktifkan semester ini? Pastikan mengaktifkan semester lain agar data baru tetap memiliki konteks."
				}
				confirmText={
					confirmModal.action === "delete"
						? "Hapus"
						: confirmModal.action === "activate"
						? "Aktifkan"
						: "Nonaktifkan"
				}
				cancelText="Batal"
				isDangerous={
					confirmModal.action === "delete" ||
					confirmModal.action === "deactivate"
				}
				onConfirm={executeConfirmation}
				onCancel={() =>
					setConfirmModal({ isOpen: false, action: null, semesterId: null })
				}
			/>
		</Layout>
	);
}
