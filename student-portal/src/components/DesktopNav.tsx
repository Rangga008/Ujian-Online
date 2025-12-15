import Link from "next/link";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

export default function DesktopNav() {
	const router = useRouter();
	const { user } = useAuthStore();

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
		<nav className="hidden md:block fixed left-0 top-0 bottom-0 w-56 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg overflow-y-auto z-40">
			<div className="p-6 space-y-4">
				<div className="mb-8 pb-6 border-b border-blue-400">
					<div className="text-2xl font-bold">Portal Siswa</div>
					<div className="text-sm text-blue-100 mt-2">{user?.name}</div>
					<div className="text-xs text-blue-200">NIS: {user?.nis}</div>
				</div>

				<div className="space-y-2">
					{navItems.map((item) => {
						const active = isActive(item.href);
						return (
							<Link key={item.href} href={item.href} legacyBehavior>
								<a
									className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
										active
											? "bg-white bg-opacity-20 text-white font-semibold"
											: "text-blue-100 hover:bg-white hover:bg-opacity-10"
									}`}
								>
									<span className="text-xl">{item.icon}</span>
									<span>{item.name}</span>
								</a>
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
