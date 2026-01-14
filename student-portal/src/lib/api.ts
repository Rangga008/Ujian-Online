import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("student_token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Clear localStorage
			localStorage.removeItem("student_token");
			localStorage.removeItem("student_user");

			// Redirect to login only if not already there
			if (
				typeof window !== "undefined" &&
				!window.location.pathname.includes("/login")
			) {
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	}
);

export default api;
