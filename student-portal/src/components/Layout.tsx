import Footer from "./Footer";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

interface LayoutProps {
	children: ReactNode;
	logo?: string;
}

export default function Layout({ children, logo }: LayoutProps) {
	const router = useRouter();
	const { user, isAuthenticated, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
		if (!isAuthenticated) {
			router.push("/login");
		}
	}, [isAuthenticated, router, checkAuth]);

	if (!isAuthenticated) return null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
			<DesktopNav />

			<main className="flex-1 overflow-x-hidden px-3 sm:px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-8 md:ml-56">
				<div className="max-w-1xl mx-auto">{children}</div>
			</main>

			<Footer />
			<BottomNav />
		</div>
	);
}
