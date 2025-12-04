import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

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

	const [loading, setLoading] = useState(true);
	const [classData, setClassData] = useState<ClassDetail | null>(null);
	const [availableStudents, setAvailableStudents] = useState<
		AvailableStudent[]
	>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

	useEffect(() => {
		if (!id) return;
		fetchAll();
	}, [id]);

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [classResponse, studentsResponse] = await Promise.all([
				api.get(`/classes/${id}`),
				api.get(`/students`, {
					params: { semesterId: undefined }, // Will be filtered after we get class semester
				}),
			]);

			const cls = classResponse.data;
			console.log("Fetched class:", cls);
			setClassData(cls);

			// Filter students by same semester and not in any class yet
			// Note: Check if student has semester property and class relationship
			const allStudents = studentsResponse.data;
			console.log("All students:", allStudents);
			const filtered = allStudents.filter((s: any) => {
				// Check if student is in the same semester as the class
				const inSameSemester = s.semester?.id === cls.semesterId;
				// Check if student is not already in a class
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

				{/* Students Section */}
				<div className="card">
					<div className="p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">
								Daftar Siswa ({classData.students?.length || 0})
							</h2>
							<button
								onClick={() => setShowAddModal(true)}
								className="btn btn-primary"
								disabled={
									(classData.students?.length || 0) >= classData.capacity
								}
							>
								+ Tambah Siswa
							</button>
						</div>

						{classData.capacity &&
							(classData.students?.length || 0) >= classData.capacity && (
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
									{classData.students && classData.students.length > 0 ? (
										classData.students.map((student) => (
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
										))
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
												{availableStudents.map((student) => (
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
									<div className="mt-4 text-sm text-gray-600">
										{selectedStudentIds.length} siswa dipilih
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
			</div>
		</Layout>
	);
}
