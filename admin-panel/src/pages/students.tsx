import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function StudentsPage() {
	const [students, setStudents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		nis: "",
		password: "",
		kelas: "",
		jurusan: "",
	});

	useEffect(() => {
		fetchStudents();
	}, []);

	const fetchStudents = async () => {
		try {
			const response = await api.get("/users?role=student");
			setStudents(response.data);
		} catch (error) {
			toast.error("Gagal memuat data siswa");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/users", {
				...formData,
				role: "student",
			});
			toast.success("Siswa berhasil ditambahkan");
			setShowModal(false);
			setFormData({
				name: "",
				email: "",
				nis: "",
				password: "",
				kelas: "",
				jurusan: "",
			});
			fetchStudents();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menambahkan siswa");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Yakin ingin menghapus siswa ini?")) return;

		try {
			await api.delete(`/users/${id}`);
			toast.success("Siswa berhasil dihapus");
			fetchStudents();
		} catch (error) {
			toast.error("Gagal menghapus siswa");
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

	return (
		<Layout>
			<div>
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Kelola Siswa</h1>
					<button
						onClick={() => setShowModal(true)}
						className="btn btn-primary"
					>
						+ Tambah Siswa
					</button>
				</div>

				<div className="card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="text-left p-4">NIS</th>
									<th className="text-left p-4">Nama</th>
									<th className="text-left p-4">Email</th>
									<th className="text-left p-4">Kelas</th>
									<th className="text-left p-4">Jurusan</th>
									<th className="text-left p-4">Status</th>
									<th className="text-left p-4">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{students.map((student) => (
									<tr key={student.id} className="border-b hover:bg-gray-50">
										<td className="p-4">{student.nis}</td>
										<td className="p-4 font-medium">{student.name}</td>
										<td className="p-4">{student.email}</td>
										<td className="p-4">{student.kelas || "-"}</td>
										<td className="p-4">{student.jurusan || "-"}</td>
										<td className="p-4">
											<span
												className={`px-3 py-1 rounded-full text-sm ${
													student.isActive
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{student.isActive ? "Aktif" : "Nonaktif"}
											</span>
										</td>
										<td className="p-4">
											<button
												onClick={() => handleDelete(student.id)}
												className="text-red-600 hover:text-red-700"
											>
												Hapus
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Modal Add Student */}
				{showModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-8 max-w-md w-full">
							<h2 className="text-2xl font-bold mb-6">Tambah Siswa Baru</h2>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">Nama</label>
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
								<div>
									<label className="block text-sm font-medium mb-2">
										Email
									</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										className="input"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">NIS</label>
									<input
										type="text"
										value={formData.nis}
										onChange={(e) =>
											setFormData({ ...formData, nis: e.target.value })
										}
										className="input"
										required
									/>
								</div>
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
								<div>
									<label className="block text-sm font-medium mb-2">
										Kelas
									</label>
									<input
										type="text"
										value={formData.kelas}
										onChange={(e) =>
											setFormData({ ...formData, kelas: e.target.value })
										}
										className="input"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">
										Jurusan
									</label>
									<input
										type="text"
										value={formData.jurusan}
										onChange={(e) =>
											setFormData({ ...formData, jurusan: e.target.value })
										}
										className="input"
									/>
								</div>
								<div className="flex gap-3 pt-4">
									<button type="submit" className="btn btn-primary flex-1">
										Simpan
									</button>
									<button
										type="button"
										onClick={() => setShowModal(false)}
										className="btn btn-secondary flex-1"
									>
										Batal
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
