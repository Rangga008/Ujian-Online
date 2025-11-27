import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
	id: number;
	name: string;
	nis: string;
	kelas: string;
	jurusan: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	login: (nis: string, password: string) => Promise<void>;
	logout: () => void;
	checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,

			login: async (nis: string, password: string) => {
				try {
					const response = await api.post("/auth/login/student", {
						nis,
						password,
					});

					const { access_token, user } = response.data;

					localStorage.setItem("student_token", access_token);
					localStorage.setItem("student_user", JSON.stringify(user));

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
				localStorage.removeItem("student_token");
				localStorage.removeItem("student_user");
				set({
					user: null,
					token: null,
					isAuthenticated: false,
				});
			},

			checkAuth: () => {
				const token = localStorage.getItem("student_token");
				const userStr = localStorage.getItem("student_user");

				if (token && userStr) {
					const user = JSON.parse(userStr);
					set({
						user,
						token,
						isAuthenticated: true,
					});
				}
			},
		}),
		{
			name: "student-auth-storage",
		}
	)
);
