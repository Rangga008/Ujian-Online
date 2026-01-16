import Link from "next/link";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import { useSidebar } from "@/context/SidebarContext";

export default function DesktopNav() {
	const router = useRouter();
	const { user } = useAuthStore();
	const { isOpen, toggleSidebar } = useSidebar();

	const navItems = [
		{ name: "Dashboard", href: "/dashboard", icon: "🏠" },
		{ name: "Ujian", href: "/exams", icon: "📝" },
		{ name: "Cari", href: "/search", icon: "🔍" },
		{ name: "Riwayat", href: "/history", icon: "📊" },
		{ name: "Profil", href: "/profile", icon: "👤" },
	];

	const isActive = (href: string) =>
		router.pathname === href || router.pathname.startsWith(href + "/");

	return (
		<>
			{/* Sidebar Toggle Button - visible when closed */}
			{!isOpen && (
				<button
					onClick={toggleSidebar}
					className="hidden md:block fixed top-6 left-6 z-50 p-2.5 bg-white hover:bg-gray-100 rounded-lg shadow-md transition"
					title="Buka sidebar"
				>
					<svg
						className="w-6 h-6 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			)}

			{/* Sidebar */}
			<nav
				className={`hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white text-gray-900 shadow-xl overflow-y-auto z-40 transition-transform duration-300 flex-col ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
					<div className="flex-1">
						<div className="text-xl font-bold">Portal Siswa</div>
						<div className="text-sm text-blue-100 mt-1">
							{user?.studentName || user?.name}
						</div>
						<div className="text-xs text-blue-200 mt-0.5">NIS: {user?.nis}</div>
					</div>
					{/* Close Button */}
					<button
						onClick={toggleSidebar}
						className="p-1.5 hover:bg-blue-500 rounded-lg transition ml-2"
						title="Tutup sidebar"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Navigation */}
				<div className="flex-1 px-4 py-6 space-y-2">
					{navItems.map((item) => {
						const active = isActive(item.href);
						return (
							<Link key={item.href} href={item.href} legacyBehavior>
								<a
									className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
										active
											? "bg-blue-100 text-blue-700 font-semibold"
											: "text-gray-700 hover:bg-gray-100"
									}`}
								>
									<span className="text-xl">{item.icon}</span>
									<span>{item.name}</span>
								</a>
							</Link>
						);
					})}
				</div>

				{/* Footer in Sidebar */}
				<div className="border-t border-gray-200 px-4 py-4 text-xs text-gray-500 text-center">
					<p>Portal Siswa v1.0</p>
				</div>
			</nav>
		</>
	);
}
