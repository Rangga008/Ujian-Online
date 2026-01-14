import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import { isPageAccessible } from "@/lib/authGuard";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";
import toast from "react-hot-toast";
import classesApi, { Class } from "@/lib/classesApi";
import semestersApi, { Semester } from "@/lib/semestersApi";

interface User {
	id: number;
	name: string;
	email: string;
	role: "admin" | "teacher" | "student";
	nis?: string;
	nip?: string;
	activeStudent?: {
		id: number;
		name: string;
		classId: number | null;
		class: Class | null;
	} | null;
	teachingClasses?: Class[];
}

export default function UsersPage() {
	const router = useRouter();
	const { user } = useAuthStore();

	useEffect(() => {
		if (user && !isPageAccessible("/users", user.role)) {
			router.push("/dashboard");
		}
	}, [user, router]);

	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [selectedRole, setSelectedRole] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [classes, setClasses] = useState<Class[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [assigningUser, setAssigningUser] = useState<User | null>(null);
	const [assignClassId, setAssignClassId] = useState<number | null>(null);
	const [showTeacherAssignModal, setShowTeacherAssignModal] = useState(false);
	const [assigningTeacher, setAssigningTeacher] = useState<User | null>(null);
	const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<
		number[]
	>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		role: "student",
		nis: "",
		nip: "",
		studentName: "",
	});

	useEffect(() => {
		fetchUsers();
		fetchClasses();
		fetchActiveSemester();
	}, []);

	// Reset to page 1 when search or role filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedRole]);

	const fetchUsers = async () => {
		try {
			const response = await api.get("/users");
			// Add activeStudent property by finding the student record with active semester
			const usersWithActiveStudent = response.data.map((user: any) => {
				const activeStudent = user.students?.find(
					(s: any) => s.semester?.isActive
				);
				return {
					...user,
					activeStudent,
				};
			});
			setUsers(usersWithActiveStudent);
		} catch (error) {
			toast.error("Gagal memuat data pengguna");
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

	const fetchActiveSemester = async () => {
		try {
			const active = await semestersApi.getActive();
			setActiveSemester(active);
		} catch (error) {
			console.log("Tidak ada semester aktif");
		}
	};

	const handleOpenModal = (user?: User) => {
		if (user) {
			setEditingUser(user);
			setFormData({
				name: user.name,
				email: user.email,
				password: "",
				role: user.role,
				nis: user.nis || "",
				nip: user.nip || "",
				studentName: user.activeStudent?.name || "",
			});
		} else {
			setEditingUser(null);
			setFormData({
				name: "",
				email: "",
				password: "",
				role: "student",
				nis: "",
				nip: "",
				studentName: "",
			});
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingUser(null);
		setFormData({
			name: "",
			email: "",
			password: "",
			role: "student",
			nis: "",
			nip: "",
			studentName: "",
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload: any = {
				name: formData.name,
				role: formData.role,
			};

			// Only include email if it has a value
			if (formData.email) {
				payload.email = formData.email;
			}

			if (formData.role === "student") {
				payload.nis = formData.nis;
				if (formData.studentName) {
					payload.studentName = formData.studentName;
				}
			}
			if (formData.role === "teacher") {
				payload.nip = formData.nip;
			}

			if (formData.password) {
				payload.password = formData.password;
			}

			if (editingUser) {
				await api.put(`/users/${editingUser.id}`, payload);
				toast.success("Data pengguna berhasil diperbarui");
			} else {
				await api.post("/users", payload);
				toast.success("Pengguna berhasil ditambahkan");
			}

			handleCloseModal();
			fetchUsers();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menyimpan data");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Yakin ingin menghapus pengguna ini?")) return;

		try {
			await api.delete(`/users/${id}`);
			toast.success("Pengguna berhasil dihapus");
			fetchUsers();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menghapus pengguna");
		}
	};

	const handleOpenAssignModal = (user: User) => {
		setAssigningUser(user);
		setAssignClassId(user.activeStudent?.classId || null);
		setShowAssignModal(true);
	};

	const handleAssignClass = async () => {
		if (!assigningUser || !assigningUser.activeStudent) {
			toast.error("Data siswa tidak valid");
			return;
		}

		console.log("Assigning class:", {
			studentId: assigningUser.activeStudent.id,
			classId: assignClassId,
		});

		try {
			const response = await api.patch(
				`/students/${assigningUser.activeStudent.id}/assign-class`,
				{
					classId: assignClassId,
				}
			);
			console.log("Assign response:", response.data);
			toast.success("Kelas berhasil diassign");
			setShowAssignModal(false);
			await fetchUsers();
		} catch (error: any) {
			console.error("Assign error:", error);
			toast.error(error.response?.data?.message || "Gagal assign kelas");
		}
	};

	const handleOpenTeacherAssignModal = (user: User) => {
		setAssigningTeacher(user);
		setSelectedTeacherClasses(user.teachingClasses?.map((c) => c.id) || []);
		setShowTeacherAssignModal(true);
	};

	const handleAssignTeacherClasses = async () => {
		if (!assigningTeacher) {
			toast.error("Data guru tidak valid");
			return;
		}

		try {
			await api.post(`/users/${assigningTeacher.id}/assign-classes`, {
				classIds: selectedTeacherClasses,
			});
			toast.success("Kelas guru berhasil diupdate");
			setShowTeacherAssignModal(false);
			await fetchUsers();
		} catch (error: any) {
			console.error("Assign teacher error:", error);
			toast.error(
				error.response?.data?.message || "Gagal assign kelas ke guru"
			);
		}
	};
	// Reset to page 1 when search or role filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedRole]);

	const allFilteredUsers = users
		.filter((user) =>
			selectedRole === "all" ? true : user.role === selectedRole
		)
		.filter((user) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return (
				(user?.name ? user.name.toLowerCase().includes(query) : false) ||
				(user?.email ? user.email.toLowerCase().includes(query) : false) ||
				(user?.nis ? user.nis.toLowerCase().includes(query) : false) ||
				(user?.nip ? user.nip.toLowerCase().includes(query) : false)
			);
		});

	const totalPages = Math.ceil(allFilteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = allFilteredUsers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleItemsPerPageChange = (newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1);
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
			<Head>
				<title>Kelola Pengguna - Admin Panel</title>
			</Head>
			<div className="px-2 sm:px-0">
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
							Kelola Pengguna
						</h1>
						<p className="text-gray-600 mt-2">
							Manajemen pengguna sistem (Admin, Guru, Siswa)
						</p>
					</div>
					<button onClick={() => handleOpenModal()} className="btn btn-primary">
						+ Tambah Pengguna
					</button>
				</div>

				<div className="mb-4 flex gap-4 items-end">
					<div className="flex-1">
						<label className="block text-sm font-medium mb-2">
							Cari Pengguna:
						</label>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Cari nama, email, NIS, atau NIP..."
							className="input"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-2">
							Filter Role:
						</label>
						<select
							value={selectedRole}
							onChange={(e) => setSelectedRole(e.target.value)}
							className="input max-w-xs"
						>
							<option value="all">Semua Role</option>
							<option value="admin">Admin</option>
							<option value="teacher">Guru</option>
							<option value="student">Siswa</option>
						</select>
					</div>
				</div>

				<div className="card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="text-left p-4">Nama</th>
									<th className="text-left p-4">Email</th>
									<th className="text-left p-4">Role</th>
									<th className="text-left p-4">NIS/NIP</th>
									<th className="text-left p-4">Kelas</th>
									<th className="text-left p-4">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{paginatedUsers.map((user) => (
									<tr key={user.id} className="border-b hover:bg-gray-50">
										<td className="p-4 font-medium">
											{user.name ||
												(user.role === "student" && user.activeStudent?.name) ||
												"-"}
										</td>
										<td className="p-4">{user.email}</td>
										<td className="p-4">
											<span
												className={`px-3 py-1 rounded-full text-sm ${
													user.role === "admin"
														? "bg-purple-100 text-purple-800"
														: user.role === "teacher"
														? "bg-blue-100 text-blue-800"
														: "bg-green-100 text-green-800"
												}`}
											>
												{user.role === "admin"
													? "Admin"
													: user.role === "teacher"
													? "Guru"
													: "Siswa"}
											</span>
										</td>
										<td className="p-4">{user.nis || user.nip || "-"}</td>
										<td className="p-4">
											{user.role === "student" && user.activeStudent ? (
												<span>
													{user.activeStudent.class
														? `${user.activeStudent.class.name} - ${user.activeStudent.class.major}`
														: "Belum ada kelas"}
												</span>
											) : (
												"-"
											)}
										</td>
										<td className="p-4">
											<div className="flex gap-2">
												<Link
													href={`/users/${user.id}`}
													className="text-blue-600 hover:text-blue-700"
												>
													Detail
												</Link>
												<button
													onClick={() => handleOpenModal(user)}
													className="text-blue-600 hover:text-blue-700"
												>
													Edit
												</button>
												<button
													onClick={() => handleDelete(user.id)}
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
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						totalItems={allFilteredUsers.length}
						onPageChange={handlePageChange}
						onItemsPerPageChange={handleItemsPerPageChange}
					/>
				</div>

				{/* Modal Create/Edit User */}
				{showModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={handleCloseModal}
					>
						<div
							className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<h2 className="text-2xl font-bold mb-6">
								{editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
							</h2>
							<form onSubmit={handleSubmit} className="space-y-4">
								{formData.role === "student" ? (
									<div>
										<label className="block text-sm font-medium mb-2">
											Nama Siswa (Nama Sebenarnya)
										</label>
										<input
											type="text"
											value={formData.studentName}
											onChange={(e) =>
												setFormData({
													...formData,
													studentName: e.target.value,
												})
											}
											className="input"
											placeholder="Contoh: Budi Satoso"
											required
										/>
									</div>
								) : (
									<div>
										<label className="block text-sm font-medium mb-2">
											Nama
										</label>
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
								)}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium mb-2">
											Email{" "}
											{(formData.role === "teacher" ||
												formData.role === "student") &&
												"(Opsional)"}
										</label>
										<input
											type="email"
											value={formData.email}
											onChange={(e) =>
												setFormData({ ...formData, email: e.target.value })
											}
											className="input"
											required={formData.role === "admin"}
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">
											Role
										</label>
										<select
											value={formData.role}
											onChange={(e) =>
												setFormData({ ...formData, role: e.target.value })
											}
											className="input"
											required
										>
											<option value="student">Siswa</option>
											<option value="teacher">Guru</option>
											<option value="admin">Admin</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									{!editingUser && (
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
									)}
									{formData.role === "student" && (
										<div>
											<label className="block text-sm font-medium mb-2">
												Username (NIS)
											</label>
											<input
												type="text"
												value={formData.nis}
												onChange={(e) =>
													setFormData({ ...formData, nis: e.target.value })
												}
												className="input"
												placeholder="Nomor Induk Siswa"
												required
											/>
										</div>
									)}
									{formData.role === "teacher" && (
										<div>
											<label className="block text-sm font-medium mb-2">
												Username (NIP)
											</label>
											<input
												type="text"
												value={formData.nip}
												onChange={(e) =>
													setFormData({ ...formData, nip: e.target.value })
												}
												className="input"
												placeholder="Nomor Induk Pegawai"
												required
											/>
										</div>
									)}
								</div>
								<div className="flex gap-3 pt-4">
									<button type="submit" className="btn btn-primary flex-1">
										Simpan
									</button>
									<button
										type="button"
										onClick={handleCloseModal}
										className="btn btn-secondary flex-1"
									>
										Batal
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Modal Assign Class */}
				{showAssignModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setShowAssignModal(false)}
					>
						<div
							className="bg-white rounded-lg p-8 max-w-md w-full"
							onClick={(e) => e.stopPropagation()}
						>
							<h2 className="text-2xl font-bold mb-6">Assign Kelas</h2>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">
										Pilih Kelas
									</label>
									<select
										value={assignClassId || ""}
										onChange={(e) =>
											setAssignClassId(
												e.target.value ? parseInt(e.target.value) : null
											)
										}
										className="input"
									>
										<option value="">Tidak ada kelas</option>
										{classes
											.filter((c) =>
												activeSemester
													? c.semesterId === activeSemester.id
													: true
											)
											.map((cls) => (
												<option key={cls.id} value={cls.id}>
													{cls.name} - {cls.major}
												</option>
											))}
									</select>
								</div>
								<div className="flex gap-3 pt-4">
									<button
										onClick={handleAssignClass}
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
					</div>
				)}
			</div>
		</Layout>
	);
}
