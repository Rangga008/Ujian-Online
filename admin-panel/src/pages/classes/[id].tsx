import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import subjectsApi from "@/lib/subjectsApi";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

interface Subject {
	id: number;
	name: string;
	code: string;
	color?: string;
}

interface ClassDetail {
	id: number;
	name: string;
	grade: number;
	major: string;
	academicYear: number;
	capacity: number;
	isActive: boolean;
	semesterId: number;
	semester: {
		id: number;
		name: string;
		year: string;
		type: string;
		isActive: boolean;
	};
	students: Array<{
		id: number;
		name: string;
		userId: number;
		user: {
			id: number;
			name: string;
			email: string;
			nis: string;
		};
	}>;
	teachers: Array<{
		id: number;
		name: string;
		email: string;
	}>;
	subjects?: Subject[];
}

interface AvailableStudent {
	id: number;
	userId: number;
	name: string;
	user: {
		id: number;
		name: string;
		email: string;
		nis: string;
	};
}

export default function ClassDetailPage() {
	const router = useRouter();
	const { id } = router.query;
	const { user } = useAuthStore();

	const [loading, setLoading] = useState(true);
	const [classData, setClassData] = useState<ClassDetail | null>(null);
	const [enrolledStudents, setEnrolledStudents] = useState<AvailableStudent[]>(
		[]
	);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [availableStudents, setAvailableStudents] = useState<
		AvailableStudent[]
	>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showSubjectsModal, setShowSubjectsModal] = useState(false);
	const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
	const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
	const [searchAvailable, setSearchAvailable] = useState("");
	const [searchEnrolled, setSearchEnrolled] = useState("");

	useEffect(() => {
		if (!id) return;
		fetchAll();
	}, [id]);

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [classResponse, studentsResponse, subjectsResponse] =
				await Promise.all([
					api.get(`/classes/${id}`),
					api.get(`/students`, {
						params: { semesterId: undefined }, // Will be filtered after we get class semester
					}),
					subjectsApi.getAll(),
				]);

			const cls = classResponse.data;
			console.log("Fetched class:", cls);
			setClassData(cls);
			setSubjects(subjectsResponse);

			// Re-fetch enrolled students from students endpoint to ensure user relation is present
			const enrolledResponse = await api.get(`/students`, {
				params: { classId: cls.id },
			});
			setEnrolledStudents(enrolledResponse.data || cls.students || []);

			const allStudents = studentsResponse.data;
			console.log("All students:", allStudents);

			const filtered = allStudents.filter((s: any) => {
				const inSameSemester = s.semester?.id === cls.semesterId;
				const notInClass = !s.class || s.class === null;
				return inSameSemester && notInClass;
			});
			console.log("Filtered available students:", filtered);
			setAvailableStudents(filtered);
		} catch (error) {
			console.error("Fetch all error:", error);
			toast.error("Gagal memuat data kelas");
		} finally {
			setLoading(false);
		}
	};

	const handleAddStudents = async () => {
		if (selectedStudentIds.length === 0) {
			toast.error("Pilih minimal 1 siswa");
			return;
		}

		try {
			// Update each selected student's classId
			const results = await Promise.all(
				selectedStudentIds.map((studentId) =>
					api.patch(`/students/${studentId}/assign-class`, {
						classId: classData?.id,
					})
				)
			);
			// Results available if needed

			toast.success(
				`${selectedStudentIds.length} siswa berhasil ditambahkan ke kelas`
			);
			setShowAddModal(false);
			setSelectedStudentIds([]);
			await fetchAll();
		} catch (error: any) {
			console.error("Add students error:", error);
			toast.error(
				error.response?.data?.message || "Gagal menambahkan siswa ke kelas"
			);
		}
	};

	const handleRemoveStudent = async (studentId: number) => {
		if (!confirm("Yakin ingin mengeluarkan siswa dari kelas ini?")) return;

		try {
			// Set classId to null
			await api.patch(`/students/${studentId}/assign-class`, {
				classId: null,
			});
			toast.success("Siswa berhasil dikeluarkan dari kelas");
			await fetchAll();
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || "Gagal mengeluarkan siswa dari kelas"
			);
		}
	};

	const toggleStudentSelection = (studentId: number) => {
		setSelectedStudentIds((prev) =>
			prev.includes(studentId)
				? prev.filter((id) => id !== studentId)
				: [...prev, studentId]
		);
	};

	const filterByKeyword = <T extends { user?: any; name?: string }>(
		items: T[],
		keyword: string
	) => {
		if (!keyword.trim()) return items;
		const q = keyword.toLowerCase();
		return items.filter((item) => {
			const name = item.user?.name || item.name || "";
			const email = item.user?.email || "";
			const nis = item.user?.nis || "";
			return (
				name.toLowerCase().includes(q) ||
				email.toLowerCase().includes(q) ||
				nis.toLowerCase().includes(q)
			);
		});
	};

	const handleManageSubjects = () => {
		setSelectedSubjectIds(classData?.subjects?.map((s) => s.id) || []);
		setShowSubjectsModal(true);
	};

	const handleSaveSubjects = async () => {
		if (!classData) return;

		try {
			await api.patch(`/classes/${classData.id}/subjects`, {
				subjectIds: selectedSubjectIds,
			});
			toast.success("Mata pelajaran berhasil diperbarui");
			setShowSubjectsModal(false);
			await fetchAll();
		} catch (error: any) {
			console.error("Save subjects error:", error);
			toast.error(
				error.response?.data?.message || "Gagal menyimpan mata pelajaran"
			);
		}
	};

	const toggleSubject = (subjectId: number) => {
		setSelectedSubjectIds((prev) =>
			prev.includes(subjectId)
				? prev.filter((id) => id !== subjectId)
				: [...prev, subjectId]
		);
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

	if (!classData) {
		return (
			<Layout>
				<div className="p-6">Data kelas tidak ditemukan.</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div>
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Detail Kelas: {classData.name}
						</h1>
						<p className="text-gray-600 mt-2">
							{classData.major} - Tingkat {classData.grade}
						</p>
					</div>
					<button
						onClick={() => router.push("/classes")}
						className="btn btn-secondary"
					>
						Kembali
					</button>
				</div>
				{/* Class Info Card */}
				<div className="card mb-6">
					<div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<div className="text-sm text-gray-500">Semester</div>
							<div className="text-lg font-medium">
								{classData.semester.name} - {classData.semester.year}
								{classData.semester.isActive && (
									<span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
										AKTIF
									</span>
								)}
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-500">Kapasitas</div>
							<div className="text-lg font-medium">
								{classData.students?.length || 0} / {classData.capacity} siswa
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-500">Status</div>
							<div>
								<span
									className={`px-3 py-1 rounded-full text-sm ${
										classData.isActive
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
									}`}
								>
									{classData.isActive ? "Aktif" : "Nonaktif"}
								</span>
							</div>
						</div>
					</div>
				</div>
				{/* Wali Kelas */}
				<div className="card mb-6">
					<div className="p-6 flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold mb-2">Wali Kelas</h2>
							{classData.teachers && classData.teachers.length > 0 ? (
								<div className="space-y-1">
									<div className="text-lg font-medium">
										{classData.teachers[0].name}
									</div>
									<div className="text-sm text-gray-600">
										{classData.teachers[0].email}
									</div>
								</div>
							) : (
								<div className="text-gray-600">Belum ada wali kelas</div>
							)}
						</div>
						{user?.role === "admin" && (
							<Link href="/teachers" className="btn btn-primary">
								Kelola Guru
							</Link>
						)}
					</div>
				</div>{" "}
				{/* Subjects Section */}
				<div className="card mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">Mata Pelajaran</h2>
							<button
								onClick={handleManageSubjects}
								className="btn btn-primary"
							>
								📚 Kelola Mata Pelajaran
							</button>
						</div>

						{classData.subjects && classData.subjects.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{classData.subjects.map((subject) => (
									<div
										key={subject.id}
										className="p-4 border rounded-lg hover:shadow-md transition-shadow"
										style={{
											backgroundColor: subject.color
												? `${subject.color}15`
												: "#f3f4f6",
											borderColor: subject.color || "#e5e7eb",
										}}
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="font-semibold text-gray-900">
													{subject.name}
												</h3>
												<p className="text-sm text-gray-600 mt-1">
													Kode: {subject.code}
												</p>
											</div>
											{subject.color && (
												<div
													className="w-4 h-4 rounded-full"
													style={{ backgroundColor: subject.color }}
												/>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
								Belum ada mata pelajaran. Klik tombol "Kelola Mata Pelajaran"
								untuk menambahkan.
							</div>
						)}
					</div>
				</div>
				{/* Students Section */}
				<div className="card">
					<div className="p-6">
						<div className="flex items-center justify-between gap-4 flex-wrap mb-4">
							<h2 className="text-xl font-semibold">
								Daftar Siswa ({enrolledStudents.length})
							</h2>
							<div className="flex items-center gap-3 flex-wrap">
								<input
									type="text"
									value={searchEnrolled}
									onChange={(e) => setSearchEnrolled(e.target.value)}
									placeholder="Cari NIS/Nama/Email"
									className="input w-64"
								/>
								<button
									onClick={() => setShowAddModal(true)}
									className="btn btn-primary"
									disabled={
										(classData.capacity ?? 0) > 0 &&
										enrolledStudents.length >= (classData.capacity || 0)
									}
								>
									+ Tambah Siswa
								</button>
							</div>
						</div>

						{classData.capacity &&
							enrolledStudents.length >= classData.capacity && (
								<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
									⚠️ Kelas sudah penuh. Kapasitas maksimal tercapai.
								</div>
							)}

						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b">
										<th className="text-left p-4">NIS</th>
										<th className="text-left p-4">Nama</th>
										<th className="text-left p-4">Email</th>
										<th className="text-left p-4">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{enrolledStudents.length > 0 ? (
										filterByKeyword(enrolledStudents, searchEnrolled).map(
											(student) => (
												<tr
													key={student.id}
													className="border-b hover:bg-gray-50"
												>
													<td className="p-4">{student.user?.nis || "-"}</td>
													<td className="p-4 font-medium">
														{student.user?.name || student.name}
													</td>
													<td className="p-4">{student.user?.email || "-"}</td>
													<td className="p-4">
														<div className="flex gap-2">
															<Link
																href={`/users/${student.userId}`}
																className="text-blue-600 hover:text-blue-700"
															>
																Detail
															</Link>
															<button
																onClick={() => handleRemoveStudent(student.id)}
																className="text-red-600 hover:text-red-700"
															>
																Keluarkan
															</button>
														</div>
													</td>
												</tr>
											)
										)
									) : (
										<tr>
											<td className="p-4 text-center text-gray-500" colSpan={4}>
												Belum ada siswa di kelas ini.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				{/* Add Students Modal */}
				{showAddModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setShowAddModal(false)}
					>
						<div
							className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-2xl font-bold mb-6">
								Tambah Siswa ke Kelas {classData.name}
							</h3>

							<div className="flex items-center gap-3 mb-4">
								<input
									type="text"
									value={searchAvailable}
									onChange={(e) => setSearchAvailable(e.target.value)}
									placeholder="Cari NIS/Nama/Email"
									className="input w-full"
								/>
								<button
									onClick={() => setSearchAvailable("")}
									className="btn btn-secondary"
								>
									Reset
								</button>
							</div>

							{availableStudents.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									Tidak ada siswa yang tersedia untuk ditambahkan.
									<br />
									<span className="text-sm">
										(Hanya menampilkan siswa di semester yang sama dan belum
										masuk kelas)
									</span>
								</div>
							) : (
								<>
									<div className="mb-4 text-sm text-gray-600">
										Pilih siswa yang ingin ditambahkan ke kelas ini:
									</div>
									<div className="max-h-96 overflow-y-auto border rounded-lg">
										<table className="w-full">
											<thead className="bg-gray-50 sticky top-0">
												<tr className="border-b">
													<th className="text-left p-3 w-12">
														<input
															type="checkbox"
															checked={
																selectedStudentIds.length ===
																	availableStudents.length &&
																availableStudents.length > 0
															}
															onChange={(e) => {
																if (e.target.checked) {
																	setSelectedStudentIds(
																		availableStudents.map((s) => s.id)
																	);
																} else {
																	setSelectedStudentIds([]);
																}
															}}
															className="w-4 h-4"
														/>
													</th>
													<th className="text-left p-3">NIS</th>
													<th className="text-left p-3">Nama</th>
													<th className="text-left p-3">Email</th>
												</tr>
											</thead>
											<tbody>
												{filterByKeyword(
													availableStudents,
													searchAvailable
												).map((student) => (
													<tr
														key={student.id}
														className="border-b hover:bg-gray-50"
													>
														<td className="p-3">
															<input
																type="checkbox"
																checked={selectedStudentIds.includes(
																	student.id
																)}
																onChange={() =>
																	toggleStudentSelection(student.id)
																}
																className="w-4 h-4 cursor-pointer"
															/>
														</td>
														<td className="p-3">{student.user?.nis || "-"}</td>
														<td className="p-3 font-medium">
															{student.user?.name || student.name}
														</td>
														<td className="p-3 text-sm text-gray-600">
															{student.user?.email || "-"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									<div className="mt-4 text-sm text-gray-600 flex justify-between flex-wrap gap-2">
										<span>{selectedStudentIds.length} siswa dipilih</span>
										<span>
											Tampil:{" "}
											{
												filterByKeyword(availableStudents, searchAvailable)
													.length
											}{" "}
											/ {availableStudents.length}
										</span>
									</div>
								</>
							)}

							<div className="flex gap-3 pt-6">
								<button
									onClick={handleAddStudents}
									className="btn btn-primary flex-1"
									disabled={selectedStudentIds.length === 0}
								>
									Tambahkan ({selectedStudentIds.length})
								</button>
								<button
									onClick={() => {
										setShowAddModal(false);
										setSelectedStudentIds([]);
									}}
									className="btn btn-secondary flex-1"
								>
									Batal
								</button>
							</div>
						</div>
					</div>
				)}
				{/* Manage Subjects Modal */}
				{showSubjectsModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setShowSubjectsModal(false)}
					>
						<div
							className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-2xl font-bold mb-6">
								Kelola Mata Pelajaran - {classData?.name}
							</h3>

							{subjects.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									Tidak ada mata pelajaran tersedia
								</div>
							) : (
								<>
									<div className="mb-4 text-sm text-gray-600">
										Pilih mata pelajaran yang diajarkan di kelas ini:
									</div>
									<div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
										<div className="space-y-3">
											{subjects.map((subject) => (
												<label
													key={subject.id}
													className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-3 rounded-lg transition"
												>
													<input
														type="checkbox"
														checked={selectedSubjectIds.includes(subject.id)}
														onChange={() => toggleSubject(subject.id)}
														className="w-5 h-5 text-blue-600"
													/>
													<div className="flex-1">
														<div className="font-medium text-gray-900">
															{subject.name}
														</div>
														<div className="text-sm text-gray-500">
															Kode: {subject.code}
														</div>
													</div>
													{subject.color && (
														<div
															className="w-6 h-6 rounded"
															style={{ backgroundColor: subject.color }}
														/>
													)}
												</label>
											))}
										</div>
									</div>
									<div className="mt-4 p-3 bg-blue-50 rounded-lg">
										<p className="text-sm text-blue-800">
											<strong>{selectedSubjectIds.length}</strong> mata
											pelajaran dipilih
										</p>
									</div>
								</>
							)}

							<div className="flex gap-3 pt-6">
								<button
									onClick={handleSaveSubjects}
									className="btn btn-primary flex-1"
									disabled={subjects.length === 0}
								>
									Simpan Mata Pelajaran
								</button>
								<button
									onClick={() => {
										setShowSubjectsModal(false);
										setSelectedSubjectIds([]);
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
