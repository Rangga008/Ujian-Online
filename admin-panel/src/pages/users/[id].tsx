import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import classesApi, { Class } from "@/lib/classesApi";
import semestersApi, { Semester } from "@/lib/semestersApi";
import { useAuthStore } from "@/store/authStore";

interface UserDetail {
	id: number;
	name: string;
	email: string;
	role: "admin" | "teacher" | "student";
	nis?: string;
	nip?: string;
	isActive: boolean;
}

export default function UserDetailPage() {
	const router = useRouter();
	const { id } = router.query;
	const { user: authUser } = useAuthStore();

	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<UserDetail | null>(null);
	const [classes, setClasses] = useState<Class[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [studentRecords, setStudentRecords] = useState<any[]>([]);
	const [activities, setActivities] = useState<any[]>([]);
	const [showRawActivities, setShowRawActivities] = useState(false);

	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditClassModal, setShowEditClassModal] = useState(false);
	const [editingStudent, setEditingStudent] = useState<any | null>(null);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
		null
	);
	const [selectedClassId, setSelectedClassId] = useState<string>("");
	const [showEditUserModal, setShowEditUserModal] = useState(false);
	const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
	const [editFormData, setEditFormData] = useState({
		name: "",
		email: "",
		nis: "",
		nip: "",
	});
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	useEffect(() => {
		if (!id) return;
		fetchAll();
	}, [id]);

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [u, cls, active, allSemesters, studentsData, acts] =
				await Promise.all([
					api.get(`/users/${id}`).then((r) => r.data),
					classesApi.getAll(),
					semestersApi.getActive().catch(() => null),
					semestersApi.getAll(),
					api
						.get(`/students/user/${id}`)
						.then((r) => r.data)
						.catch(() => []),
					api
						.get(`/users/${id}/activities`)
						.then((r) => r.data)
						.catch(() => []),
				]);
			console.log("Fetched user:", u);
			console.log("User students:", studentsData);
			console.log("User activities (raw):", acts);
			setUser(u);
			setClasses(cls);
			setActiveSemester(active);
			setSemesters(allSemesters);
			setStudentRecords(studentsData);
			setActivities(acts);
		} catch (error) {
			console.error("Fetch all error:", error);
			toast.error("Gagal memuat detail pengguna");
		} finally {
			setLoading(false);
		}
	};

	const openAssign = () => {
		if (!user) return;
		// Find active student record from students array
		const activeStudent = studentRecords.find((s) => s.semester?.isActive);
		setEditingStudent(activeStudent || null);
		// Convert null to empty string for dropdown
		setSelectedClassId(
			activeStudent?.classId === null
				? ""
				: String(activeStudent?.classId || "")
		);
		setShowEditClassModal(true);
	};

	const handleAddToSemester = async () => {
		if (!selectedSemesterId) {
			toast.error("Pilih semester terlebih dahulu");
			return;
		}

		// Check if student already exists in this semester
		const exists = studentRecords.find(
			(s) => s.semesterId === selectedSemesterId
		);
		if (exists) {
			toast.error("Siswa sudah terdaftar di semester ini");
			return;
		}

		try {
			await api.post("/students", {
				userId: user!.id,
				semesterId: selectedSemesterId,
				classId: selectedClassId === "" ? null : parseInt(selectedClassId),
				name: user!.name,
			});

			toast.success("Siswa berhasil ditambahkan ke semester");
			setShowAddModal(false);
			setSelectedSemesterId(null);
			setSelectedClassId("");
			await fetchAll();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menambahkan siswa");
		}
	};

	const handleRemoveFromSemester = async (studentId: number) => {
		if (
			!confirm(
				"Yakin ingin menghapus siswa dari semester ini? Data ujian dan nilai akan ikut terhapus."
			)
		)
			return;

		try {
			await api.delete(`/students/${studentId}`);
			toast.success("Siswa berhasil dihapus dari semester");
			await fetchAll();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menghapus siswa");
		}
	};

	const assignClass = async () => {
		if (!editingStudent) {
			toast.error("Data siswa tidak ditemukan");
			return;
		}

		console.log("Assigning class:", {
			studentId: editingStudent.id,
			classId: selectedClassId,
		});

		try {
			// Send null if "Belum ada kelas" is selected, otherwise parse as integer
			const classIdToSend =
				selectedClassId === null || selectedClassId === ""
					? null
					: parseInt(selectedClassId as string);

			const response = await api.patch(
				`/students/${editingStudent.id}/assign-class`,
				{
					classId: classIdToSend,
				}
			);
			console.log("Assign class response:", response.data);
			toast.success("Kelas berhasil diperbarui");
			setShowEditClassModal(false);
			setEditingStudent(null);
			setSelectedClassId("");
			await fetchAll();
		} catch (error: any) {
			console.error("Assign class error:", error);
			toast.error(error.response?.data?.message || "Gagal mengubah kelas");
		}
	};

	const handleOpenEditUser = () => {
		if (!user) return;
		const activeStudent = studentRecords.find((s) => s.semester?.isActive);
		setEditFormData({
			name:
				user.role === "student" && activeStudent
					? activeStudent.name
					: user.name,
			email: user.email,
			nis: user.nis || "",
			nip: user.nip || "",
		});
		setShowEditUserModal(true);
	};

	const handleUpdateUser = async () => {
		if (!user) return;
		if (!editFormData.name) {
			toast.error("Nama harus diisi");
			return;
		}
		// Email required for student and admin, optional for teacher
		if (!editFormData.email && user.role !== "teacher") {
			toast.error("Email harus diisi");
			return;
		}

		try {
			const payload: any = {
				name: editFormData.name,
				role: user.role,
			};
			// Only include email if it has a value
			if (editFormData.email) {
				payload.email = editFormData.email;
			}
			if (user.role === "student" && editFormData.nis) {
				payload.nis = editFormData.nis;
			}
			if (user.role === "teacher" && editFormData.nip) {
				payload.nip = editFormData.nip;
			}
			await api.put(`/users/${user.id}`, payload);
			toast.success("Data pengguna berhasil diperbarui");
			setShowEditUserModal(false);
			await fetchAll();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal memperbarui data");
		}
	};

	const handleResetPassword = async () => {
		if (!user) return;
		if (!newPassword || !confirmPassword) {
			toast.error("Password baru dan konfirmasi harus diisi");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("Password dan konfirmasi tidak cocok");
			return;
		}
		if (newPassword.length < 6) {
			toast.error("Password minimal 6 karakter");
			return;
		}

		try {
			await api.put(`/users/${user.id}`, {
				password: newPassword,
				role: user.role,
			});
			toast.success("Password berhasil direset");
			setShowResetPasswordModal(false);
			setNewPassword("");
			setConfirmPassword("");
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal reset password");
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

	if (!user) {
		return (
			<Layout>
				<div className="p-6">Data pengguna tidak ditemukan.</div>
			</Layout>
		);
	}

	const isStudent = user.role === "student";
	const isTeacher = user.role === "teacher";
	const isReadOnly = authUser?.role === "teacher";
	const activeStudent = studentRecords.find((s) => s.semester?.isActive);

	// Get available semesters (not yet enrolled)
	const enrolledSemesterIds = studentRecords.map((s: any) => s.semesterId);
	const availableSemesters = semesters.filter(
		(sem) => !enrolledSemesterIds.includes(sem.id)
	);

	return (
		<Layout>
			<Head>
				<title>{`Detail Pengguna - ${
					user?.name || "Loading"
				} - Admin Panel`}</title>
			</Head>
			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
									Detail Pengguna:{" "}
									{isStudent && activeStudent
										? activeStudent.name
										: user?.name || "Loading..."}
								</h1>
								<p className="text-gray-600 mt-2">ID: {user.id}</p>
							</div>
							<div className="flex gap-2 w-full sm:w-auto">
								<button
									onClick={handleOpenEditUser}
									className="btn btn-primary flex-1 sm:flex-none"
								>
									Edit Profil
								</button>
								<button
									onClick={() => setShowResetPasswordModal(true)}
									className="btn btn-secondary flex-1 sm:flex-none"
								>
									Reset Password
								</button>
								<button
									onClick={() =>
										router.push(isStudent ? "/students" : "/users")
									}
									className="btn btn-secondary flex-1 sm:flex-none"
								>
									Kembali
								</button>
							</div>
						</div>
						{/* Profile Card */}
						<div className="card mb-6">
							<div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
								<div>
									<div className="text-sm text-gray-500">Nama</div>
									<div className="text-lg font-medium">
										{isStudent && activeStudent
											? activeStudent.name
											: user.name}
									</div>
								</div>
								<div>
									<div className="text-sm text-gray-500">Email</div>
									<div className="text-lg font-medium">{user.email}</div>
								</div>
								<div>
									<div className="text-sm text-gray-500">Role</div>
									<div className="text-lg font-medium capitalize">
										{user.role}
									</div>
								</div>
								{isStudent && (
									<div>
										<div className="text-sm text-gray-500">NIS</div>
										<div className="text-lg font-medium">{user.nis || "-"}</div>
									</div>
								)}
								{user.role === "teacher" && (
									<div>
										<div className="text-sm text-gray-500">NIP</div>
										<div className="text-lg font-medium">{user.nip || "-"}</div>
									</div>
								)}
								<div>
									<div className="text-sm text-gray-500">Status Akun</div>
									<span
										className={`px-3 py-1 rounded-full text-sm ${
											user.isActive
												? "bg-green-100 text-green-800"
												: "bg-red-100 text-red-800"
										}`}
									>
										{user.isActive ? "Aktif" : "Nonaktif"}
									</span>
								</div>
								{isStudent && activeStudent?.gender && (
									<div>
										<div className="text-sm text-gray-500">Jenis Kelamin</div>
										<div className="text-lg font-medium capitalize">
											{activeStudent.gender === "male"
												? "Laki-laki"
												: "Perempuan"}
										</div>
									</div>
								)}
								{isStudent && activeStudent?.dateOfBirth && (
									<div>
										<div className="text-sm text-gray-500">Tanggal Lahir</div>
										<div className="text-lg font-medium">
											{new Date(activeStudent.dateOfBirth).toLocaleDateString(
												"id-ID",
												{
													day: "numeric",
													month: "long",
													year: "numeric",
												}
											)}
										</div>
									</div>
								)}
							</div>
						</div>
						{/* Activities moved to right column */}

						{/* Student specific sections */}
						{isStudent && (
							<>
								{/* Active semester and class */}
								<div className="card mb-6">
									<div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
										<div>
											<div className="text-sm text-gray-500">
												Semester Aktif
											</div>
											<div className="text-lg font-medium">
												{activeSemester
													? `${activeSemester.name} - ${activeSemester.year}`
													: "Tidak ada semester aktif"}
											</div>
										</div>
										<div>
											<div className="text-sm text-gray-500">
												Kelas Saat Ini
											</div>
											<div className="text-lg font-medium">
												{activeStudent?.class
													? `${activeStudent.class.name} - ${activeStudent.class.major}`
													: "Belum ada kelas"}
											</div>
										</div>
										<div className="md:min-w-[180px]">
											<button
												onClick={openAssign}
												className="btn btn-primary w-full"
												disabled={!activeStudent || isReadOnly}
											>
												Ubah Kelas
											</button>
										</div>
									</div>
								</div>

								{/* History */}
								<div className="card">
									<div className="p-6">
										<div className="flex items-center justify-between mb-4">
											<h2 className="text-xl font-semibold">
												Riwayat Semester ({studentRecords.length})
											</h2>
											<button
												onClick={() => setShowAddModal(true)}
												className="btn btn-primary"
												disabled={availableSemesters.length === 0 || isReadOnly}
											>
												+ Tambah ke Semester
											</button>
										</div>

										{availableSemesters.length === 0 &&
											studentRecords.length > 0 && (
												<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
													ℹ️ Siswa sudah terdaftar di semua semester yang
													tersedia.
												</div>
											)}

										<div className="overflow-x-auto">
											<table className="w-full">
												<thead>
													<tr className="border-b">
														<th className="text-left p-4">Semester</th>
														<th className="text-left p-4">Tahun</th>
														<th className="text-left p-4">Kelas</th>
														<th className="text-left p-4">Status</th>
														<th className="text-left p-4">Aksi</th>
													</tr>
												</thead>
												<tbody>
													{studentRecords.length === 0 ? (
														<tr>
															<td
																className="p-4 text-center text-gray-500"
																colSpan={5}
															>
																Siswa belum terdaftar di semester manapun.
															</td>
														</tr>
													) : (
														studentRecords
															.sort((a: any, b: any) => {
																// Sort by year descending, then by type
																if (a.semester.year !== b.semester.year) {
																	return b.semester.year.localeCompare(
																		a.semester.year
																	);
																}
																return a.semester.type === "ganjil" ? -1 : 1;
															})
															.map((record: any) => (
																<tr
																	key={record.id}
																	className="border-b hover:bg-gray-50"
																>
																	<td className="p-4">
																		<span className="font-medium">
																			{record.semester.name}
																		</span>
																		{record.semester.isActive && (
																			<span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
																				AKTIF
																			</span>
																		)}
																	</td>
																	<td className="p-4">
																		{record.semester.year}
																	</td>
																	<td className="p-4">
																		{record.class ? (
																			<div className="flex items-center gap-2">
																				<span>
																					{record.class.name} -{" "}
																					{record.class.major}
																				</span>
																				<Link
																					href={`/classes/${record.class.id}`}
																					className="text-blue-600 hover:text-blue-800 text-sm"
																					title="Lihat detail kelas"
																				>
																					Lihat Kelas
																				</Link>
																			</div>
																		) : (
																			<span className="text-gray-500">
																				Belum ada kelas
																			</span>
																		)}
																	</td>
																	<td className="p-4">
																		<span
																			className={`px-3 py-1 rounded-full text-sm ${
																				record.semester.isActive
																					? "bg-green-100 text-green-800"
																					: "bg-gray-100 text-gray-800"
																			}`}
																		>
																			{record.semester.isActive
																				? "Aktif"
																				: "Nonaktif"}
																		</span>
																	</td>
																	<td className="p-4">
																		<div className="flex gap-2">
																			<button
																				onClick={() => {
																					setEditingStudent(record);
																					setSelectedClassId(record.classId);
																					setShowEditClassModal(true);
																				}}
																				className="text-blue-600 hover:text-blue-700"
																			>
																				Ubah Kelas
																			</button>
																			<button
																				onClick={() =>
																					handleRemoveFromSemester(record.id)
																				}
																				className="text-red-600 hover:text-red-700"
																			>
																				Hapus
																			</button>
																		</div>
																	</td>
																</tr>
															))
													)}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							</>
						)}
						{/* Add to Semester Modal */}
						{showAddModal && (
							<div
								className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
								onClick={() => setShowAddModal(false)}
							>
								<div
									className="bg-white rounded-lg p-8 max-w-md w-full"
									onClick={(e) => e.stopPropagation()}
								>
									<h3 className="text-2xl font-bold mb-6">
										Tambah Siswa ke Semester
									</h3>

									{availableSemesters.length === 0 ? (
										<div className="text-center py-8 text-gray-500">
											Tidak ada semester yang tersedia.
											<br />
											Siswa sudah terdaftar di semua semester.
										</div>
									) : (
										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium mb-2">
													Pilih Semester <span className="text-red-500">*</span>
												</label>
												<select
													value={selectedSemesterId || ""}
													onChange={(e) => {
														setSelectedSemesterId(
															e.target.value ? parseInt(e.target.value) : null
														);
														setSelectedClassId(""); // Reset class selection
													}}
													className="input"
													required
												>
													<option value="">-- Pilih Semester --</option>
													{availableSemesters.map((sem) => (
														<option key={sem.id} value={sem.id}>
															{sem.name} - {sem.year}
															{sem.isActive ? " (AKTIF)" : ""}
														</option>
													))}
												</select>
											</div>

											{selectedSemesterId && (
												<div>
													<label className="block text-sm font-medium mb-2">
														Pilih Kelas (Opsional)
													</label>
													<select
														value={selectedClassId}
														onChange={(e) => setSelectedClassId(e.target.value)}
														className="input"
													>
														<option value="">Belum ada kelas</option>
														{classes
															.filter(
																(c) => c.semesterId === selectedSemesterId
															)
															.map((cls) => (
																<option key={cls.id} value={cls.id}>
																	{cls.name} - {cls.major}
																</option>
															))}
													</select>
												</div>
											)}
										</div>
									)}

									<div className="flex gap-3 pt-6">
										<button
											onClick={handleAddToSemester}
											className="btn btn-primary flex-1"
											disabled={!selectedSemesterId}
										>
											Tambahkan
										</button>
										<button
											onClick={() => {
												setShowAddModal(false);
												setSelectedSemesterId(null);
												setSelectedClassId("");
											}}
											className="btn btn-secondary flex-1"
										>
											Batal
										</button>
									</div>
								</div>
							</div>
						)}
						{/* Edit Class Modal */}
						{showEditClassModal && editingStudent && (
							<div
								className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
								onClick={() => setShowEditClassModal(false)}
							>
								<div
									className="bg-white rounded-lg p-8 max-w-md w-full"
									onClick={(e) => e.stopPropagation()}
								>
									<h3 className="text-2xl font-bold mb-6">Ubah Kelas</h3>
									<p className="text-sm text-gray-600 mb-4">
										Semester: {editingStudent.semester?.name} -{" "}
										{editingStudent.semester?.year}
									</p>

									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium mb-2">
												Pilih Kelas
											</label>
											<select
												value={selectedClassId}
												onChange={(e) => setSelectedClassId(e.target.value)}
												className="input"
											>
												<option value="">Belum ada kelas</option>
												{classes
													.filter(
														(c) => c.semesterId === editingStudent.semesterId
													)
													.map((cls) => (
														<option key={cls.id} value={cls.id}>
															{cls.name} - {cls.major}
														</option>
													))}
											</select>
										</div>
									</div>

									<div className="flex gap-3 pt-6">
										<button
											onClick={assignClass}
											className="btn btn-primary flex-1"
										>
											Simpan
										</button>
										<button
											onClick={() => {
												setShowEditClassModal(false);
												setEditingStudent(null);
												setSelectedClassId("");
											}}
											className="btn btn-secondary flex-1"
										>
											Batal
										</button>
									</div>
								</div>
							</div>
						)}
						{/* Edit User Modal */}
						{showEditUserModal && (
							<div
								className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
								onClick={() => setShowEditUserModal(false)}
							>
								<div
									className="bg-white rounded-lg p-8 max-w-md w-full"
									onClick={(e) => e.stopPropagation()}
								>
									<h3 className="text-2xl font-bold mb-6">Edit Profil</h3>

									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium mb-2">
												Nama
											</label>
											<input
												type="text"
												value={editFormData.name}
												onChange={(e) =>
													setEditFormData({
														...editFormData,
														name: e.target.value,
													})
												}
												className="input"
												required
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-2">
												Email{" "}
												{(user.role === "teacher" || user.role === "student") &&
													"(Opsional)"}
											</label>
											<input
												type="email"
												value={editFormData.email}
												onChange={(e) =>
													setEditFormData({
														...editFormData,
														email: e.target.value,
													})
												}
												className="input"
												required={user.role === "admin"}
											/>
										</div>
										{user.role === "student" && (
											<div>
												<label className="block text-sm font-medium mb-2">
													Username (NIS)
												</label>
												<input
													type="text"
													value={editFormData.nis}
													onChange={(e) =>
														setEditFormData({
															...editFormData,
															nis: e.target.value,
														})
													}
													className="input"
													placeholder="Nomor Induk Siswa"
												/>
											</div>
										)}
										{user.role === "teacher" && (
											<div>
												<label className="block text-sm font-medium mb-2">
													Username (NIP)
												</label>
												<input
													type="text"
													value={editFormData.nip}
													onChange={(e) =>
														setEditFormData({
															...editFormData,
															nip: e.target.value,
														})
													}
													className="input"
													placeholder="Nomor Induk Pegawai"
												/>
											</div>
										)}
									</div>

									<div className="flex gap-3 pt-6">
										<button
											onClick={handleUpdateUser}
											className="btn btn-primary flex-1"
										>
											Simpan
										</button>
										<button
											onClick={() => setShowEditUserModal(false)}
											className="btn btn-secondary flex-1"
										>
											Batal
										</button>
									</div>
								</div>
							</div>
						)}
						{/* Reset Password Modal */}
						{showResetPasswordModal && (
							<div
								className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
								onClick={() => setShowResetPasswordModal(false)}
							>
								<div
									className="bg-white rounded-lg p-8 max-w-md w-full"
									onClick={(e) => e.stopPropagation()}
								>
									<h3 className="text-2xl font-bold mb-6">Reset Password</h3>
									<p className="text-sm text-gray-600 mb-4">
										User: <strong>{user.name}</strong>
									</p>

									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium mb-2">
												Password Baru
											</label>
											<input
												type="password"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												className="input"
												placeholder="Minimal 6 karakter"
												required
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-2">
												Konfirmasi Password
											</label>
											<input
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												className="input"
												placeholder="Ulangi password baru"
												required
											/>
										</div>
									</div>

									<div className="flex gap-3 pt-6">
										<button
											onClick={handleResetPassword}
											className="btn btn-primary flex-1"
										>
											Reset Password
										</button>
										<button
											onClick={() => {
												setShowResetPasswordModal(false);
												setNewPassword("");
												setConfirmPassword("");
											}}
											className="btn btn-secondary flex-1"
										>
											Batal
										</button>
									</div>
								</div>
							</div>
						)}
						{/* close left column and add right column placeholder */}
					</div>
					<div className="lg:col-span-1">
						{/* Activities (right column) */}
						<div className="card mb-6">
							<div className="p-6">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold mb-3">
										Aktivitas Terakhir
									</h3>
									<button
										className="text-xs text-gray-500 hover:text-gray-700"
										onClick={() => setShowRawActivities(!showRawActivities)}
									>
										Raw
									</button>
								</div>
								{activities.length === 0 ? (
									<div className="text-sm text-gray-500">
										Belum ada aktivitas
									</div>
								) : (
									<ul className="space-y-3">
										{activities.map((a) => (
											<li
												key={`${a.type}-${a.resource?.id}-${a.date}`}
												className="flex items-start gap-3"
											>
												<div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
												<div>
													<div className="text-sm font-medium">{a.action}</div>
													<div className="text-xs text-gray-500">
														{a.type === "submission"
															? `Ujian: ${a.resource?.title}`
															: a.resource?.text}
													</div>
													<div className="text-xs text-gray-400">
														{new Date(a.date).toLocaleString()}
													</div>
												</div>
											</li>
										))}
									</ul>
								)}
								{showRawActivities && (
									<pre className="mt-3 text-xs overflow-auto max-h-64">
										{JSON.stringify(activities, null, 2)}
									</pre>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
}
