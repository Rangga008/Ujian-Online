import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ActiveSemesterBanner from "@/components/ActiveSemesterBanner";
import api from "@/lib/api";
import toast from "react-hot-toast";
import classesApi, { Class } from "@/lib/classesApi";
import semestersApi, { Semester } from "@/lib/semestersApi";

interface UserDetail {
	id: number;
	name: string;
	email: string;
	role: "admin" | "teacher" | "student";
	nis?: string;
	nip?: string;
	activeStudent?: {
		id: number;
		classId: number | null;
		class: Class | null;
	} | null;
}

interface StudentHistoryRecord {
	id: number;
	semesterId: number;
	semesterName: string;
	semesterYear: string;
	isActive: boolean;
	classId: number | null;
	className: string | null;
	classGrade: string | null;
	classMajor: string | null;
}

export default function UserDetailPage() {
	const router = useRouter();
	const { id } = router.query;

	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<UserDetail | null>(null);
	const [classes, setClasses] = useState<Class[]>([]);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [history, setHistory] = useState<StudentHistoryRecord[]>([]);

	const [showAssignModal, setShowAssignModal] = useState(false);
	const [assignClassId, setAssignClassId] = useState<number | null>(null);

	useEffect(() => {
		if (!id) return;
		fetchAll();
	}, [id]);

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [u, cls, active] = await Promise.all([
				api.get(`/users/${id}`).then((r) => r.data),
				classesApi.getAll(),
				semestersApi.getActive().catch(() => null),
			]);
			setUser(u);
			setClasses(cls);
			setActiveSemester(active);

			if (u?.role === "student") {
				const hist = await api
					.get(`/students/user/${u.id}/history`)
					.then((r) => r.data as StudentHistoryRecord[]);
				console.log("Fetched history:", hist);
				setHistory(hist);
			} else {
				setHistory([]);
			}
		} catch (error) {
			console.error("Fetch all error:", error);
			toast.error("Gagal memuat detail pengguna");
		} finally {
			setLoading(false);
		}
	};

	const openAssign = () => {
		if (!user) return;
		setAssignClassId(user.activeStudent?.classId ?? null);
		setShowAssignModal(true);
	};

	const assignClass = async () => {
		if (!user?.activeStudent) {
			toast.error("Data siswa tidak ditemukan");
			return;
		}

		console.log("Assigning class:", {
			studentId: user.activeStudent.id,
			classId: assignClassId,
		});

		try {
			const response = await api.patch(
				`/students/${user.activeStudent.id}/assign-class`,
				{
					classId: assignClassId,
				}
			);
			console.log("Assign class response:", response.data);
			toast.success("Kelas berhasil diperbarui");
			setShowAssignModal(false);
			await fetchAll();
		} catch (error: any) {
			console.error("Assign class error:", error);
			toast.error(error.response?.data?.message || "Gagal mengubah kelas");
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
	const filteredClasses = activeSemester
		? classes.filter((c) => c.semesterId === activeSemester.id)
		: classes;

	return (
		<Layout>
			<div>
				<div className="mb-4">
					<ActiveSemesterBanner />
				</div>

				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Detail Pengguna
						</h1>
						<p className="text-gray-600 mt-2">ID: {user.id}</p>
					</div>
					<button
						onClick={() => router.push("/users")}
						className="btn btn-secondary"
					>
						Kembali
					</button>
				</div>

				{/* Profile Card */}
				<div className="card mb-6">
					<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<div className="text-sm text-gray-500">Nama</div>
							<div className="text-lg font-medium">{user.name}</div>
						</div>
						<div>
							<div className="text-sm text-gray-500">Email</div>
							<div className="text-lg font-medium">{user.email}</div>
						</div>
						<div>
							<div className="text-sm text-gray-500">Role</div>
							<div className="text-lg font-medium capitalize">{user.role}</div>
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
					</div>
				</div>

				{/* Student specific sections */}
				{isStudent && (
					<>
						{/* Active semester and class */}
						<div className="card mb-6">
							<div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
								<div>
									<div className="text-sm text-gray-500">Semester Aktif</div>
									<div className="text-lg font-medium">
										{activeSemester
											? `${activeSemester.name} - ${activeSemester.year}`
											: "Tidak ada semester aktif"}
									</div>
								</div>
								<div>
									<div className="text-sm text-gray-500">Kelas Saat Ini</div>
									<div className="text-lg font-medium">
										{user.activeStudent?.class
											? `${user.activeStudent.class.name} - ${user.activeStudent.class.major}`
											: "Belum ada kelas"}
									</div>
								</div>
								<div className="md:min-w-[180px]">
									<button
										onClick={openAssign}
										className="btn btn-primary w-full"
									>
										Assign Kelas
									</button>
								</div>
							</div>
						</div>

						{/* History */}
						<div className="card">
							<div className="p-6">
								<h2 className="text-xl font-semibold mb-4">Riwayat Semester</h2>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b">
												<th className="text-left p-4">Semester</th>
												<th className="text-left p-4">Tahun</th>
												<th className="text-left p-4">Kelas</th>
												<th className="text-left p-4">Status</th>
											</tr>
										</thead>
										<tbody>
											{history.map((h) => (
												<tr key={h.id} className="border-b hover:bg-gray-50">
													<td className="p-4">{h.semesterName || "-"}</td>
													<td className="p-4">{h.semesterYear || "-"}</td>
													<td className="p-4">
														{h.className
															? `${h.className} - ${h.classMajor}`
															: "-"}
													</td>
													<td className="p-4">
														<span
															className={`px-3 py-1 rounded-full text-sm ${
																h.isActive
																	? "bg-green-100 text-green-800"
																	: "bg-gray-100 text-gray-800"
															}`}
														>
															{h.isActive ? "Aktif" : "Nonaktif"}
														</span>
													</td>
												</tr>
											))}
											{history.length === 0 && (
												<tr>
													<td
														className="p-4 text-center text-gray-500"
														colSpan={4}
													>
														Belum ada riwayat.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Assign class modal */}
				{showAssignModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setShowAssignModal(false)}
					>
						<div
							className="bg-white rounded-lg p-8 max-w-md w-full"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-2xl font-bold mb-6">Assign Kelas</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">
										Pilih Kelas
									</label>
									<select
										value={assignClassId ?? ""}
										onChange={(e) =>
											setAssignClassId(
												e.target.value ? parseInt(e.target.value) : null
											)
										}
										className="input"
									>
										<option value="">Tidak ada kelas</option>
										{filteredClasses.map((cls) => (
											<option key={cls.id} value={cls.id}>
												{cls.name} - {cls.major}
											</option>
										))}
									</select>
								</div>
								<div className="flex gap-3 pt-4">
									<button
										onClick={assignClass}
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
