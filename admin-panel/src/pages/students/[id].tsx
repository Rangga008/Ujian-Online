import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

interface StudentRecord {
	id: number;
	userId: number;
	semesterId: number;
	classId: number | null;
	name: string;
	semester: {
		id: number;
		name: string;
		year: string;
		type: string;
		isActive: boolean;
	};
	class: {
		id: number;
		name: string;
		major: string;
		grade: number;
	} | null;
	user: {
		id: number;
		name: string;
		email: string;
		nis: string;
		role: string;
		isActive: boolean;
	};
}

export default function StudentDetailPage() {
	const router = useRouter();
	const { id } = router.query; // This is userId

	const [loading, setLoading] = useState(true);
	const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
	const [user, setUser] = useState<any>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditClassModal, setShowEditClassModal] = useState(false);
	const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(
		null
	);
	const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
		null
	);
	const [selectedClassId, setSelectedClassId] = useState<string>("");

	useEffect(() => {
		if (!id) return;
		fetchAll();
	}, [id]);

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [userResponse, studentsResponse, semestersData, classesData] =
				await Promise.all([
					api.get(`/users/${id}`),
					api.get(`/students/user/${id}`),
					semestersApi.getAll(),
					classesApi.getAll(),
				]);

			setUser(userResponse.data);
			setStudentRecords(studentsResponse.data);
			setSemesters(semestersData);
			setClasses(classesData);
		} catch (error) {
			console.error("Fetch error:", error);
			toast.error("Gagal memuat data siswa");
		} finally {
			setLoading(false);
		}
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
				userId: user.id,
				semesterId: selectedSemesterId,
				classId: selectedClassId === "" ? null : parseInt(selectedClassId),
				name: user.name,
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

	const handleAssignClass = async (student: StudentRecord) => {
		setEditingStudent(student);
		// Convert null to empty string for dropdown
		setSelectedClassId(student.classId === null ? "" : String(student.classId));
		setShowEditClassModal(true);
	};

	const handleSaveClass = async () => {
		if (!editingStudent) return;

		try {
			// Send null if "Belum ada kelas" is selected, otherwise parse as integer
			const classIdToSend =
				selectedClassId === null || selectedClassId === ""
					? null
					: parseInt(selectedClassId as string);

			await api.patch(`/students/${editingStudent.id}/assign-class`, {
				classId: classIdToSend,
			});
			toast.success("Kelas berhasil diperbarui");
			setShowEditClassModal(false);
			setEditingStudent(null);
			setSelectedClassId("");
			await fetchAll();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal memperbarui kelas");
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
				<div className="p-6">Data siswa tidak ditemukan.</div>
			</Layout>
		);
	}

	// Get available semesters (not yet enrolled)
	const enrolledSemesterIds = studentRecords.map((s) => s.semesterId);
	const availableSemesters = semesters.filter(
		(sem) => !enrolledSemesterIds.includes(sem.id)
	);

	return (
		<Layout>
			<div>
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Detail Siswa: {user.name}
						</h1>
						<p className="text-gray-600 mt-2">
							NIS: {user.nis} | Email: {user.email}
						</p>
					</div>
					<button
						onClick={() => router.push("/students")}
						className="btn btn-secondary"
					>
						Kembali
					</button>
				</div>

				{/* User Info Card */}
				<div className="card mb-6">
					<div className="p-6">
						<h2 className="text-xl font-semibold mb-4">Informasi Akun</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<div className="text-sm text-gray-500">Nama Lengkap</div>
								<div className="text-lg font-medium">{user.name}</div>
							</div>
							<div>
								<div className="text-sm text-gray-500">Email</div>
								<div className="text-lg font-medium">{user.email}</div>
							</div>
							<div>
								<div className="text-sm text-gray-500">NIS</div>
								<div className="text-lg font-medium">{user.nis}</div>
							</div>
							<div>
								<div className="text-sm text-gray-500">Role</div>
								<div className="text-lg font-medium capitalize">
									{user.role}
								</div>
							</div>
							<div>
								<div className="text-sm text-gray-500">Status Akun</div>
								<div>
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
							</div>
						</div>
					</div>
				</div>

				{/* Semester Records */}
				<div className="card">
					<div className="p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">
								Riwayat Semester ({studentRecords.length})
							</h2>
							<button
								onClick={() => setShowAddModal(true)}
								className="btn btn-primary"
								disabled={availableSemesters.length === 0}
							>
								+ Tambah ke Semester
							</button>
						</div>

						{availableSemesters.length === 0 && (
							<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
								ℹ️ Siswa sudah terdaftar di semua semester yang tersedia.
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
											<td className="p-4 text-center text-gray-500" colSpan={5}>
												Siswa belum terdaftar di semester manapun.
											</td>
										</tr>
									) : (
										studentRecords
											.sort((a, b) => {
												// Sort by year descending, then by type
												if (a.semester.year !== b.semester.year) {
													return b.semester.year.localeCompare(a.semester.year);
												}
												return a.semester.type === "ganjil" ? -1 : 1;
											})
											.map((record) => (
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
													<td className="p-4">{record.semester.year}</td>
													<td className="p-4">
														{record.class ? (
															<span>
																{record.class.name} - {record.class.major}
															</span>
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
															{record.semester.isActive ? "Aktif" : "Nonaktif"}
														</span>
													</td>
													<td className="p-4">
														<div className="flex gap-2">
															<button
																onClick={() => handleAssignClass(record)}
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
													.filter((c) => c.semesterId === selectedSemesterId)
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
								Semester: {editingStudent.semester.name} -{" "}
								{editingStudent.semester.year}
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
											.filter((c) => c.semesterId === editingStudent.semesterId)
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
									onClick={handleSaveClass}
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
			</div>
		</Layout>
	);
}
