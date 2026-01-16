import { useState } from "react";
import Layout from "@/components/Layout";
import LogoutConfirmationModal from "@/components/LogoutConfirmationModal";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ProfilePage() {
	const router = useRouter();
	const { user, logout } = useAuthStore();
	const { isAuthenticated } = useAuthGuard();
	const [logoutModal, setLogoutModal] = useState(false);

	const handleLogoutClick = () => {
		setLogoutModal(true);
	};

	const handleConfirmLogout = async () => {
		logout();
		setLogoutModal(false);
		router.push("/login");
	};

	return (
		<Layout>
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
					<h1 className="text-3xl font-bold">Profil Saya</h1>
					<p className="mt-2 text-blue-100">
						Kelola informasi akun dan pengaturan personal Anda.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md hover:shadow-lg transition">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Informasi Pribadi
						</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-600">
									Nama Lengkap
								</label>
								<div className="mt-1 text-lg font-semibold text-gray-900">
									{user?.studentName || user?.name || "-"}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-600">
									NIS
								</label>
								<div className="mt-1 text-lg text-gray-900">
									{user?.nis || "-"}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-600">
									Kelas
								</label>
								<div className="mt-1 text-lg text-gray-900">
									{user?.kelas || user?.class?.name || "-"}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-600">
									Mata Pelajaran
								</label>
								<div className="mt-1 text-lg text-gray-900">
									{user?.class?.subjects && user.class.subjects.length > 0
										? user.class.subjects.map((s) => s.name).join(", ")
										: "-"}
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md hover:shadow-lg transition">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Pengaturan
						</h2>
						<p className="text-gray-600 mb-6">
							Fitur pengaturan akan segera tersedia.
						</p>
						<div className="space-y-3">
							<button
								onClick={handleLogoutClick}
								className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg"
							>
								<span>🚪</span>
								<span>Logout</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<LogoutConfirmationModal
				isOpen={logoutModal}
				onConfirm={handleConfirmLogout}
				onCancel={() => setLogoutModal(false)}
			/>
		</Layout>
	);
}
