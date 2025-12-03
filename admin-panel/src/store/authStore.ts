import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
	id: number;
	email: string;
	name: string;
	role: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isHydrated: boolean;
	login: (email: string, password: string) => Promise<void>;
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

			login: async (email: string, password: string) => {
				try {
					const response = await api.post("/auth/login/admin", {
						email,
						password,
					});

					const { access_token, user } = response.data;

					localStorage.setItem("admin_token", access_token);
					localStorage.setItem("admin_user", JSON.stringify(user));

					set({
						user,
						token: access_token,
						isAuthenticated: true,
					});
				} catch (error: any) {
					throw new Error(error.response?.data?.message || "Login failed");
				}
			},

			logout: () => {
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

				if (token && userStr) {
					const user = JSON.parse(userStr);
					set({
						user,
						token,
						isAuthenticated: true,
						isHydrated: true,
					});
				} else {
					set({ isHydrated: true });
				}
			},
		}),
		{
			name: "admin-auth-storage",
		}
	)
);
