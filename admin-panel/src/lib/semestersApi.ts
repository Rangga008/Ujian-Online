import api from "./api";

export interface Semester {
	id: number;
	name: string;
	year: string;
	type: "ganjil" | "genap";
	startDate: string;
	endDate: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

const semestersApi = {
	getAll: async (): Promise<Semester[]> => {
		const response = await api.get("/semesters");
		return response.data;
	},

	getActive: async (): Promise<Semester | null> => {
		const response = await api.get("/semesters/active");
		return response.data;
	},

	setActive: async (id: number): Promise<Semester> => {
		const response = await api.patch(`/semesters/${id}/activate`);
		return response.data;
	},

	create: async (data: Partial<Semester>): Promise<Semester> => {
		const response = await api.post("/semesters", data);
		return response.data;
	},

	update: async (id: number, data: Partial<Semester>): Promise<Semester> => {
		const response = await api.patch(`/semesters/${id}`, data);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await api.delete(`/semesters/${id}`);
	},
};

export { semestersApi };
export default semestersApi;
