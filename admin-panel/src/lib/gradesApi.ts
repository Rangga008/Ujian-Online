import api from "./api";

export interface Grade {
	id: number;
	level: number; // 1-12
	name: string; // e.g., "Kelas 1 SD", "Kelas 7 SMP", "Kelas 10 SMA"
	section: "SD" | "SMP" | "SMA"; // Sekolah Dasar, Sekolah Menengah Pertama, Sekolah Menengah Atas
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export const gradesApi = {
	getAll: async (): Promise<Grade[]> => {
		const response = await api.get("/grades");
		return response.data;
	},

	getById: async (id: number): Promise<Grade> => {
		const response = await api.get(`/grades/${id}`);
		return response.data;
	},

	create: async (data: Partial<Grade>): Promise<Grade> => {
		const response = await api.post("/grades", data);
		return response.data;
	},

	update: async (id: number, data: Partial<Grade>): Promise<Grade> => {
		const response = await api.patch(`/grades/${id}`, data);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await api.delete(`/grades/${id}`);
	},

	// Helper to get grades by section
	getBySection: async (section: "SD" | "SMP" | "SMA"): Promise<Grade[]> => {
		const response = await api.get("/grades", {
			params: { section },
		});
		return response.data;
	},

	// Helper to get active grades
	getActive: async (): Promise<Grade[]> => {
		const response = await api.get("/grades", {
			params: { isActive: true },
		});
		return response.data;
	},
};

export default gradesApi;
