import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

export default function App({ Component, pageProps }: AppProps) {
	const router = useRouter();
	const { checkAuth, isAuthenticated } = useAuthStore();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		checkAuth();
		setIsHydrated(true);
	}, [checkAuth]);

	// Protected routes
	const publicRoutes = ["/login", "/404", "/500", "/_error"];
	const isPublicRoute = publicRoutes.includes(router.pathname);

	// Wait for hydration before rendering protected routes
	if (!isHydrated) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-xl">Loading...</div>
			</div>
		);
	}

	// Redirect to login if not authenticated and trying to access protected route
	if (!isAuthenticated && !isPublicRoute) {
		if (typeof window !== "undefined") {
			router.replace("/login");
		}
		return null;
	}

	return (
		<>
			<Component {...pageProps} />
			<Toaster position="top-right" />
		</>
	);
}
