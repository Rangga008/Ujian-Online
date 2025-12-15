import Link from "next/link";
import { getAssetUrl } from "@/lib/imageUrl";

export default function Header({ logo }: { logo?: string }) {
	return (
		<header className="bg-white shadow-sm">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center gap-4">
						<Link href="/" legacyBehavior>
							<a className="flex items-center gap-3">
								<img
									src={getAssetUrl(logo || "/favicon.ico")}
									alt="logo"
									className="w-10 h-10 rounded-full object-cover"
									onError={(e) => {
										const t = e.currentTarget as HTMLImageElement;
										const fb = getAssetUrl("/favicon.ico");
										if (t.src !== fb) {
											t.onerror = null;
											t.src = fb;
										}
									}}
								/>
								<span className="text-lg font-semibold text-gray-800">
									Portal Siswa
								</span>
							</a>
						</Link>
					</div>

					<nav className="hidden md:flex items-center space-x-4">
						<Link href="/dashboard" legacyBehavior>
							<a className="text-sm text-gray-700 hover:text-primary-600">
								Dashboard
							</a>
						</Link>
					</nav>
				</div>
			</div>
		</header>
	);
}
