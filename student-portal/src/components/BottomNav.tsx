import Link from "next/link";
import { useRouter } from "next/router";

export default function BottomNav() {
	const router = useRouter();

	const navItems = [
		{
			name: "Home",
			href: "/dashboard",
			icon: "🏠",
			label: "Dashboard",
		},
		{
			name: "Search",
			href: "/search",
			icon: "🔍",
			label: "Cari",
		},
		{
			name: "Exams",
			href: "/exams",
			icon: "📝",
			label: "Ujian",
		},
		{
			name: "History",
			href: "/history",
			icon: "📊",
			label: "Riwayat",
		},
		{
			name: "Profile",
			href: "/profile",
			icon: "👤",
			label: "Profil",
		},
	];

	const isActive = (href: string) => {
		return router.pathname === href;
	};

	return (
		<nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl z-40">
			<div className="flex justify-around items-center h-16 max-w-5xl mx-auto w-full">
				{navItems.map((item) => {
					const active = isActive(item.href);
					return (
						<Link key={item.href} href={item.href} legacyBehavior>
							<a
								className={`flex flex-col items-center justify-center w-full h-full py-2 px-2 transition ${
									active
										? "text-blue-600 bg-blue-50"
										: "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
								}`}
								title={item.label}
							>
								<span
									className={`text-2xl ${active ? "scale-110" : ""} transition`}
								>
									{item.icon}
								</span>
								<span
									className={`text-xs mt-0.5 text-center font-semibold ${
										active ? "text-blue-600" : ""
									}`}
								>
									{item.label}
								</span>
							</a>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
