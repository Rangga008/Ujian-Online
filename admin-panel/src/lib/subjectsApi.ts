import api from "./api";

export interface Subject {
	id: number;
	name: string;
	code: string;
	description?: string;
	color?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export const subjectsApi = {
	getAll: async (): Promise<Subject[]> => {
		const response = await api.get("/subjects");
		return response.data;
	},

	getById: async (id: number): Promise<Subject> => {
		const response = await api.get(`/subjects/${id}`);
		return response.data;
	},

	create: async (data: Partial<Subject>): Promise<Subject> => {
		const response = await api.post("/subjects", data);
		return response.data;
	},

	update: async (id: number, data: Partial<Subject>): Promise<Subject> => {
		const response = await api.patch(`/subjects/${id}`, data);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await api.delete(`/subjects/${id}`);
	},
};

export default subjectsApi;
