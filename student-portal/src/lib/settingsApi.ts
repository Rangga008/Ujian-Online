import api from "./api";

export interface Setting {
	id: number;
	key: string;
	value: string;
	type: "text" | "number" | "boolean" | "image" | "color" | "json";
	group: string;
	label: string;
	description?: string;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

const settingsApi = {
	// Get public settings (no auth required)
	getPublic: async (): Promise<Setting[]> => {
		const response = await api.get("/settings/public");
		return response.data;
	},

	// Get settings as key-value object
	getAsObject: async (): Promise<Record<string, any>> => {
		const response = await api.get("/settings/object");
		return response.data;
	},

	// Get single setting by key
	getByKey: async (key: string): Promise<Setting> => {
		const response = await api.get(`/settings/key/${key}`);
		return response.data;
	},
};

export default settingsApi;
