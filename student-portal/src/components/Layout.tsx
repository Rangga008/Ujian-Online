import Footer from "./Footer";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import { useSidebar } from "@/context/SidebarContext";

interface LayoutProps {
	children: ReactNode;
	logo?: string;
	hideBottomNav?: boolean;
	hideDesktopNav?: boolean;
	hideFooter?: boolean;
}

export default function Layout({
	children,
	logo,
	hideBottomNav = false,
	hideDesktopNav = false,
	hideFooter = false,
}: LayoutProps) {
	const router = useRouter();
	const { user, isAuthenticated, checkAuth } = useAuthStore();
	const { isOpen, closeSidebar } = useSidebar();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		// Check auth from localStorage on mount
		checkAuth();
		setIsHydrated(true);

		// If not authenticated after checking, redirect to login
		const token = localStorage.getItem("student_token");
		if (!token) {
			router.push("/login");
		}
	}, [checkAuth, router]);

	// Close sidebar if hideDesktopNav is true (like during exam)
	useEffect(() => {
		if (hideDesktopNav) {
			closeSidebar();
		}
	}, [hideDesktopNav, closeSidebar]);

	// Don't render anything until hydrated and auth is checked
	if (!isHydrated || !isAuthenticated) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">
			{!hideDesktopNav && <DesktopNav />}

			<main
				className={`flex-1 overflow-x-hidden px-3 sm:px-4 md:px-6 py-4 md:py-6 transition-all duration-300 ${
					hideBottomNav ? "pb-6" : "pb-24 md:pb-8"
				} ${!hideDesktopNav && isOpen ? "md:ml-64" : ""}`}
			>
				<div className="max-w-7xl mx-auto">{children}</div>
			</main>

			{!hideFooter && <Footer />}
			{!hideBottomNav && <BottomNav />}
		</div>
	);
}
