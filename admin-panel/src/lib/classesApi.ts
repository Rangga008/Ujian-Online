import api from "./api";

export interface Class {
	id: number;
	name: string;
	grade: number;
	major: string;
	academicYear: string;
	semesterId?: number;
	capacity: number;
	isActive: boolean;
	semester?: {
		id: number;
		name: string;
		type: "ganjil" | "genap";
		year: string;
	};
	students?: any[];
	teachers?: any[];
	createdAt: string;
	updatedAt: string;
}

const classesApi = {
	getAll: async (): Promise<Class[]> => {
		const response = await api.get("/classes");
		return response.data;
	},

	getByActiveSemester: async (): Promise<Class[]> => {
		const response = await api.get("/classes/active-semester");
		return response.data;
	},

	getOne: async (id: number): Promise<Class> => {
		const response = await api.get(`/classes/${id}`);
		return response.data;
	},

	create: async (data: Partial<Class>): Promise<Class> => {
		const response = await api.post("/classes", data);
		return response.data;
	},

	update: async (id: number, data: Partial<Class>): Promise<Class> => {
		const response = await api.patch(`/classes/${id}`, data);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await api.delete(`/classes/${id}`);
	},
};

export { classesApi };
export default classesApi;
