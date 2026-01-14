import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface Subject {
	id: number;
	name: string;
}

interface Class {
	id: number;
	name: string;
	grade?: string;
	major?: string;
	subjects?: Subject[];
}

interface User {
	id: number;
	name: string;
	studentName?: string; // Nama sebenarnya dari student record
	nis: string;
	kelas?: string; // Class name string
	jurusan?: string;
	class?: Class; // Full class object
	classId?: number;
	semesterId?: number;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	login: (nis: string, password: string) => Promise<void>;
	logout: () => void;
	checkAuth: () => void;
}

const makeAuthStore = (usePersist: boolean) => {
	const creator = (set: any) => ({
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

				if (typeof window !== "undefined") {
					localStorage.setItem("student_token", access_token);
					localStorage.setItem("student_user", JSON.stringify(user));
				}

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
			if (typeof window !== "undefined") {
				localStorage.removeItem("student_token");
				localStorage.removeItem("student_user");
			}
			set({
				user: null,
				token: null,
				isAuthenticated: false,
			});
		},

		checkAuth: () => {
			if (typeof window === "undefined") return;
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
	});

	if (usePersist) {
		return persist(creator, { name: "student-auth-storage" });
	}

	return creator;
};

export const useAuthStore = create<AuthState>(
	// Only enable persist on the client to avoid SSR access to localStorage
	makeAuthStore(typeof window !== "undefined") as any
);
