import { useEffect, ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

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

	const menuItems = [
		{ href: "/dashboard", label: "Dashboard", icon: "📊" },
		{ href: "/exams", label: "Kelola Ujian", icon: "📝" },
		{ href: "/students", label: "Kelola Siswa", icon: "👥" },
		{ href: "/results", label: "Hasil Ujian", icon: "📈" },
	];

	if (!isAuthenticated) return null;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Sidebar */}
			<aside className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-10">
				<div className="p-6 border-b">
					<h1 className="text-2xl font-bold text-primary-600">Admin Panel</h1>
					<p className="text-sm text-gray-600 mt-1">Ujian Online</p>
				</div>

				<nav className="p-4">
					{menuItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
								router.pathname === item.href
									? "bg-primary-100 text-primary-700 font-medium"
									: "text-gray-700 hover:bg-gray-100"
							}`}
						>
							<span className="text-xl">{item.icon}</span>
							<span>{item.label}</span>
						</Link>
					))}
				</nav>

				<div className="absolute bottom-0 left-0 right-0 p-4 border-t">
					<div className="mb-3">
						<p className="text-sm font-medium text-gray-900">{user?.name}</p>
						<p className="text-xs text-gray-600">{user?.email}</p>
					</div>
					<button onClick={handleLogout} className="w-full btn btn-secondary">
						Logout
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<main className="ml-64 p-8">{children}</main>
		</div>
	);
}
