import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
	id: number;
	email: string;
	name: string;
	role: string;
	teachingClasses?: Array<{ id: number; name: string }>;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isHydrated: boolean;
	login: (
		identifier: string,
		password: string,
		method?: "email" | "nip"
	) => Promise<void>;
	logout: () => void;
	checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			isHydrated: false,

			login: async (
				identifier: string,
				password: string,
				method: "email" | "nip" = "email"
			) => {
				try {
					let response;
					if (method === "nip") {
						response = await api.post("/auth/login/admin-nip", {
							nip: identifier,
							password,
						});
					} else {
						response = await api.post("/auth/login/admin", {
							email: identifier,
							password,
						});
					}

					const { access_token, user } = response.data;

					localStorage.setItem("admin_token", access_token);
					localStorage.setItem("admin_user", JSON.stringify(user));

					console.log("[AuthStore] Login successful", { user });

					set({
						user,
						token: access_token,
						isAuthenticated: true,
					});
				} catch (error: any) {
					console.error("[AuthStore] Login failed", error);
					throw new Error(error.response?.data?.message || "Login failed");
				}
			},

			logout: () => {
				console.log("[AuthStore] Logout called");
				localStorage.removeItem("admin_token");
				localStorage.removeItem("admin_user");
				set({
					user: null,
					token: null,
					isAuthenticated: false,
				});
			},

			checkAuth: () => {
				const token = localStorage.getItem("admin_token");
				const userStr = localStorage.getItem("admin_user");

				console.log("[AuthStore] checkAuth called", {
					hasToken: !!token,
					hasUser: !!userStr,
				});

				if (token && userStr) {
					const user = JSON.parse(userStr);
					console.log("[AuthStore] Setting authenticated", { user });
					set({
						user,
						token,
						isAuthenticated: true,
						isHydrated: true,
					});
				} else {
					console.log("[AuthStore] No auth data, setting unauthenticated");
					set({
						user: null,
						token: null,
						isAuthenticated: false,
						isHydrated: true,
					});
				}
			},
		}),
		{
			name: "admin-auth-storage",
		}
	)
);
