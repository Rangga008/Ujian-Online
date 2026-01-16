import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

/**
 * Custom hook to protect pages that require authentication
 * Redirects to login if token is invalid or missing
 */
export function useAuthGuard() {
	const router = useRouter();
	const { isAuthenticated, checkAuth } = useAuthStore();
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		if (!router.isReady) return;

		// Check auth from localStorage
		checkAuth();
		const token = localStorage.getItem("student_token");

		// If token doesn't exist, redirect immediately
		if (!token) {
			router.push("/login");
			setIsChecking(false);
			return;
		}

		// Token exists, auth should be restored from persist middleware
		setIsChecking(false);
	}, [router.isReady, router, checkAuth]);

	return {
		isAuthenticated,
		isChecking,
	};
}
