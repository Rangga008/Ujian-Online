import { useEffect, ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const router = useRouter();
	const { user, isAuthenticated, logout, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
		if (!isAuthenticated) {
			router.push("/login");
		}
	}, [isAuthenticated, router, checkAuth]);

	const handleLogout = () => {
		logout();
		router.push("/login");
	};

	if (!isAuthenticated) return null;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-primary-600">
								Portal Siswa
							</h1>
							<p className="text-sm text-gray-600">Sistem Ujian Online</p>
						</div>
						<div className="flex items-center gap-4">
							<div className="text-right">
								<p className="font-medium text-gray-900">{user?.name}</p>
								<p className="text-sm text-gray-600">NIS: {user?.nis}</p>
							</div>
							<button onClick={handleLogout} className="btn btn-secondary">
								Logout
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{children}
			</main>
		</div>
	);
}
