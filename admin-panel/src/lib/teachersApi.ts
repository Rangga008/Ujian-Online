import api from "./api";

export interface Teacher {
	id: number;
	name: string;
	email: string;
	nip?: string;
	role: "teacher";
	isActive: boolean;
	teachingClasses?: Class[];
}

export interface Class {
	id: number;
	name: string;
	grade: number;
	major: string;
}

const teachersApi = {
	// Get all teachers
	async getAll(): Promise<Teacher[]> {
		const response = await api.get("/users?role=teacher");
		return response.data;
	},

	// Get single teacher
	async getById(id: number): Promise<Teacher> {
		const response = await api.get(`/users/${id}`);
		return response.data;
	},

	// Create teacher
	async create(data: {
		name: string;
		email: string;
		nip: string;
		password: string;
	}): Promise<Teacher> {
		const response = await api.post("/users", {
			...data,
			role: "teacher",
		});
		return response.data;
	},

	// Update teacher
	async update(
		id: number,
		data: Partial<{
			name: string;
			email: string;
			nip: string;
			password?: string;
		}>
	): Promise<Teacher> {
		const response = await api.put(`/users/${id}`, {
			...data,
			role: "teacher",
		});
		return response.data;
	},

	// Assign teacher to classes (optionally scoped to a semesterId)
	async assignClasses(
		teacherId: number,
		classIds: number[],
		semesterId?: number
	): Promise<Teacher> {
		const response = await api.post(`/users/${teacherId}/assign-classes`, {
			classIds,
			semesterId,
		});
		return response.data;
	},

	// Get teacher with their teaching classes for optional semester
	async getWithClasses(
		teacherId: number,
		semesterId?: number
	): Promise<Teacher> {
		const response = await api.get(`/users/${teacherId}/teaching-classes`, {
			params: { semesterId },
		});
		return response.data;
	},

	// Delete teacher
	async delete(id: number): Promise<void> {
		await api.delete(`/users/${id}`);
	},
};

export default teachersApi;
