import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { isPageAccessible } from "@/lib/authGuard";
import api from "@/lib/api";
import toast from "react-hot-toast";
import teachersApi, { Teacher } from "@/lib/teachersApi";
import classesApi, { Class as ClassType } from "@/lib/classesApi";
import semestersApi, { Semester } from "@/lib/semestersApi";

export default function TeachersPage() {
	const router = useRouter();
	const { user } = useAuthStore();

	useEffect(() => {
		if (user && !isPageAccessible("/teachers", user.role)) {
			router.push("/dashboard");
		}
	}, [user, router]);

	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [loading, setLoading] = useState(true);
	const [classes, setClasses] = useState<ClassType[]>([]);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
		null
	);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(
		null
	);
	const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean;
		id: number | null;
		type: string;
	}>({
		isOpen: false,
		id: null,
		type: "",
	});

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		nip: "",
		password: "",
	});

	useEffect(() => {
		fetchTeachers();
		fetchClasses();
		fetchSemesters();
	}, []);

	const fetchSemesters = async () => {
		try {
			const data = await semestersApi.getAll();
			setSemesters(data);
			const active = await semestersApi.getActive().catch(() => null);
			setActiveSemester(active || null);
			setSelectedSemesterId(active?.id || (data[0]?.id ?? null));
		} catch (err) {
			// ignore
		}
	};

	const fetchTeachers = async () => {
		try {
			setLoading(true);
			const data = await teachersApi.getAll();
			setTeachers(data);
		} catch (error) {
			toast.error("Gagal memuat data guru");
		} finally {
			setLoading(false);
		}
	};

	const fetchClasses = async () => {
		try {
			const data = await classesApi.getAll();
			setClasses(data);
		} catch (error) {
			toast.error("Gagal memuat data kelas");
		}
	};

	const handleOpenModal = (teacher?: Teacher) => {
		if (teacher) {
			setEditingTeacher(teacher);
			setFormData({
				name: teacher.name,
				email: teacher.email,
				nip: teacher.nip || "",
				password: "",
			});
		} else {
			setEditingTeacher(null);
			setFormData({
				name: "",
				email: "",
				nip: "",
				password: "",
			});
		}
		setShowModal(true);
	};

	const handleSave = async () => {
		if (!formData.name || !formData.email || !formData.nip) {
			toast.error("Nama, email, dan NIP harus diisi");
			return;
		}

		try {
			if (editingTeacher) {
				await teachersApi.update(editingTeacher.id, formData);
				toast.success("Guru berhasil diperbarui");
			} else {
				if (!formData.password) {
					toast.error("Password harus diisi untuk guru baru");
					return;
				}
				await teachersApi.create(formData);
				toast.success("Guru berhasil ditambahkan");
			}
			setShowModal(false);
			fetchTeachers();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menyimpan guru");
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deleteModal.id) return;

		try {
			await teachersApi.delete(deleteModal.id);
			toast.success("Guru berhasil dihapus");
			setDeleteModal({ isOpen: false, id: null, type: "" });
			fetchTeachers();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menghapus guru");
			setDeleteModal({ isOpen: false, id: null, type: "" });
		}
	};

	const handleDelete = (id: number) => {
		setDeleteModal({ isOpen: true, id, type: "teacher" });
	};

	const handleOpenAssignModal = (teacher: Teacher) => {
		setAssigningTeacher(teacher);
		// Load teacher's teaching classes for the active semester
		(async () => {
			try {
				const semId = activeSemester?.id ?? selectedSemesterId ?? undefined;
				const resp: any = await teachersApi.getWithClasses(teacher.id, semId);
				const clsIds = (resp?.teachingClasses || []).map((c: any) => c.id);
				setSelectedClassIds(clsIds);
			} catch (err) {
				setSelectedClassIds((teacher.teachingClasses || []).map((c) => c.id));
			}
		})();
		setShowAssignModal(true);
	};

	const handleAssignClasses = async () => {
		if (!assigningTeacher) {
			toast.error("Data guru tidak valid");
			return;
		}

		try {
			// Allow empty array to clear assignments for the active semester
			await teachersApi.assignClasses(
				assigningTeacher.id,
				selectedClassIds,
				activeSemester?.id ?? selectedSemesterId ?? undefined
			);
			toast.success("Kelas guru berhasil diupdate");
			setShowAssignModal(false);
			fetchTeachers();
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || "Gagal assign kelas ke guru"
			);
		}
	};

	if (loading) {
		return (
			<Layout>
				<Head>
					<title>Kelola Guru - Admin Panel</title>
				</Head>
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<Head>
				<title>Kelola Guru - Admin Panel</title>
			</Head>
			<div className="px-2 sm:px-0">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
							Kelola Guru
						</h1>
						<p className="text-gray-600 mt-2">
							Manajemen data guru dan assignment kelas
						</p>
					</div>
					<button
						onClick={() => handleOpenModal()}
						className="btn btn-primary w-full sm:w-auto"
					>
						+ Tambah Guru
					</button>
				</div>

				{teachers.length === 0 ? (
					<div className="card text-center py-12">
						<p className="text-gray-600 mb-4">Belum ada guru</p>
						<button
							onClick={() => handleOpenModal()}
							className="btn btn-primary"
						>
							Tambah Guru Pertama
						</button>
					</div>
				) : (
					<div className="card overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50 border-b">
								<tr>
									<th className="text-left p-4">Nama</th>
									<th className="text-left p-4">Email</th>
									<th className="text-left p-4">NIP</th>
									<th className="text-left p-4">Kelas Mengajar</th>
									<th className="text-left p-4">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{teachers.map((teacher) => (
									<tr key={teacher.id} className="border-b hover:bg-gray-50">
										<td className="p-4 font-medium">{teacher.name}</td>
										<td className="p-4">{teacher.email}</td>
										<td className="p-4">{teacher.nip || "-"}</td>
										<td className="p-4">
											<div className="flex items-center gap-2 flex-wrap">
												{(() => {
													const classesForActive = (
														teacher.teachingClasses || []
													).filter((c: any) =>
														activeSemester
															? c.semesterId === activeSemester.id
															: true
													);
													return classesForActive.length > 0 ? (
														<div className="flex gap-1 flex-wrap">
															{classesForActive.map((cls: any) => (
																<span
																	key={cls.id}
																	className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
																>
																	{cls.name}
																</span>
															))}
														</div>
													) : (
														<span className="text-gray-500 text-sm">
															Belum ada kelas
														</span>
													);
												})()}
												<button
													onClick={() => handleOpenAssignModal(teacher)}
													className="text-blue-600 hover:text-blue-700 text-sm"
												>
													Assign
												</button>
											</div>
										</td>
										<td className="p-4">
											<div className="flex gap-2">
												<Link
													href={`/users/${teacher.id}`}
													className="text-green-600 hover:text-green-700"
												>
													Detail
												</Link>
												<button
													onClick={() => handleOpenModal(teacher)}
													className="text-blue-600 hover:text-blue-700"
												>
													Edit
												</button>
												<button
													onClick={() => handleDelete(teacher.id)}
													className="text-red-600 hover:text-red-700"
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

				{/* Create/Edit Teacher Modal */}
				{showModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-lg max-w-md w-full p-6">
							<h2 className="text-xl font-bold mb-4">
								{editingTeacher ? "Edit Guru" : "Tambah Guru Baru"}
							</h2>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">
										Nama Guru *
									</label>
									<input
										type="text"
										className="input w-full"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										Email (Opsional)
									</label>
									<input
										type="email"
										className="input w-full"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										Username (NIP - Nomor Induk Pegawai) *
									</label>
									<input
										type="text"
										className="input w-full"
										value={formData.nip}
										onChange={(e) =>
											setFormData({ ...formData, nip: e.target.value })
										}
										placeholder="Nomor Induk Pegawai"
									/>
								</div>

								{!editingTeacher && (
									<div>
										<label className="block text-sm font-medium mb-2">
											Password *
										</label>
										<input
											type="password"
											className="input w-full"
											value={formData.password}
											onChange={(e) =>
												setFormData({
													...formData,
													password: e.target.value,
												})
											}
										/>
									</div>
								)}
							</div>

							<div className="flex gap-2 mt-6">
								<button onClick={handleSave} className="btn btn-primary flex-1">
									Simpan
								</button>
								<button
									onClick={() => setShowModal(false)}
									className="btn btn-secondary flex-1"
								>
									Batal
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Assign Classes Modal */}
				{showAssignModal && assigningTeacher && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
							<h2 className="text-xl font-bold mb-4">
								Assign Kelas - {assigningTeacher.name}
							</h2>

							<div className="space-y-3">
								<div className="mb-2">
									{activeSemester ? (
										<p className="text-sm">
											Semester aktif:{" "}
											<span className="font-medium">
												{activeSemester.name} - {activeSemester.year}
											</span>
										</p>
									) : (
										<p className="text-sm text-gray-600">
											Tidak ada semester aktif
										</p>
									)}
								</div>
								{classes
									.filter((cls) =>
										activeSemester ? cls.semesterId === activeSemester.id : true
									)
									.map((cls) => (
										<label
											key={cls.id}
											className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50"
										>
											<input
												type="checkbox"
												checked={selectedClassIds.includes(cls.id)}
												onChange={() => {
													if (selectedClassIds.includes(cls.id)) {
														setSelectedClassIds(
															selectedClassIds.filter((id) => id !== cls.id)
														);
													} else {
														setSelectedClassIds([...selectedClassIds, cls.id]);
													}
												}}
												className="w-4 h-4"
											/>
											<span className="font-medium">{cls.name}</span>
											<span className="text-gray-600 text-sm">
												({cls.major})
											</span>
										</label>
									))}
							</div>

							<div className="flex gap-2 mt-6">
								<button
									onClick={handleAssignClasses}
									className="btn btn-primary flex-1"
								>
									Simpan
								</button>
								<button
									onClick={() => setShowAssignModal(false)}
									className="btn btn-secondary flex-1"
								>
									Batal
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Hapus Guru"
				message="Yakin ingin menghapus guru ini? Tindakan ini tidak dapat dibatalkan."
				confirmText="Hapus"
				cancelText="Batal"
				isDangerous={true}
				onConfirm={handleDeleteConfirm}
				onCancel={() => setDeleteModal({ isOpen: false, id: null, type: "" })}
			/>
		</Layout>
	);
}
