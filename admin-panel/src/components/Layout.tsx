import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import ActiveSemesterBanner from "./ActiveSemesterBanner";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import Link from "next/link";

interface LayoutProps {
	children: ReactNode;
	title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
	const router = useRouter();
	const { user, isAuthenticated, logout, checkAuth } = useAuthStore();
	const { settingsObject } = useSettingsStore();
	const [logoutModal, setLogoutModal] = useState(false);

	useEffect(() => {
		checkAuth();
		if (!isAuthenticated) {
			router.push("/login");
		}
	}, [isAuthenticated, router, checkAuth]);

	const handleLogoutClick = () => {
		setLogoutModal(true);
	};

	const handleConfirmLogout = () => {
		logout();
		setLogoutModal(false);
		router.push("/login");
	};

	const allMenuItems = [
		{
			href: "/dashboard",
			label: "Dashboard",
			icon: "📊",
			roles: ["admin", "teacher"],
		},
		{
			href: "/exams",
			label: "Kelola Ujian",
			icon: "📝",
			roles: ["admin", "teacher"],
		},

		{ href: "/users", label: "Kelola User", icon: "👤", roles: ["admin"] },
		{
			href: "/students",
			label: "Kelola Siswa",
			icon: "👥",
			roles: ["admin"],
		},
		{ href: "/teachers", label: "Kelola Guru", icon: "👨‍🏫", roles: ["admin"] },
		{
			href: "/classes",
			label: "Kelola Kelas",
			icon: "🏫",
			roles: ["admin", "teacher"],
		},
		{ href: "/semesters", label: "Tahun Ajaran", icon: "📅", roles: ["admin"] },
		{
			href: "/results",
			label: "Hasil Ujian",
			icon: "📈",
			roles: ["admin", "teacher"],
		},
		{ href: "/settings", label: "Pengaturan", icon: "⚙️", roles: ["admin"] },
	];

	// Filter menu items based on user role
	const menuItems = allMenuItems.filter((item) =>
		item.roles.includes(user?.role || "")
	);

	if (!isAuthenticated) return null;

	useEffect(() => {
		// Update favicon when settings change
		const favicon = settingsObject["app.favicon"] || "/favicon.ico";
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
		if (link && favicon) {
			link.href = favicon + "?v=" + Date.now();
		}
	}, [settingsObject["app.favicon"]]);

	const appName = settingsObject["app.name"] || "Admin Panel";
	const appShort = settingsObject["app.short_name"] || "Ujian Online";
	const pageTitle = title ? `${title} - ${appName}` : appName;

	return (
		<>
			<Head>
				<title>{pageTitle}</title>
				<meta property="og:title" content={pageTitle} />
			</Head>
			<div className="min-h-screen bg-gray-50">
				{/* Sidebar */}
				<aside className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-10 flex flex-col overflow-hidden">
					<div className="p-6 border-b">
						<h1 className="text-2xl font-bold text-primary-600">{appName}</h1>
						<p className="text-sm text-gray-600 mt-1">{appShort}</p>
					</div>

					<div className="flex-1 overflow-y-auto p-4">
						<nav className="space-y-2">
							{menuItems.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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
					</div>

					<div className="p-4 border-t">
						<div className="mb-3">
							<p className="text-sm font-medium text-gray-900">{user?.name}</p>
							<p className="text-xs text-gray-600">{user?.email}</p>
						</div>
						<div className="mb-4">
							<ActiveSemesterBanner variant="compact" />
						</div>
						<button
							onClick={handleLogoutClick}
							className="w-full btn btn-secondary"
						>
							Logout
						</button>
					</div>
				</aside>

				{/* Main Content */}
				<main className="ml-64 p-8">{children}</main>

				{/* Logout Confirmation Modal */}
				<LogoutConfirmationModal
					isOpen={logoutModal}
					onConfirm={handleConfirmLogout}
					onCancel={() => setLogoutModal(false)}
				/>
			</div>
		</>
	);
}
