import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

/**
 * Custom hook to protect pages that require authentication
 * Redirects to login if token is invalid or missing
 */
export function useAuthGuard() {
	const router = useRouter();
	const { isAuthenticated } = useAuthStore();

	useEffect(() => {
		if (!router.isReady) return;

		const token = localStorage.getItem("student_token");

		// If not authenticated or token missing, redirect to login
		if (!isAuthenticated || !token) {
			router.push("/login");
		}
	}, [router, isAuthenticated]);

	return {
		isAuthenticated,
	};
}
