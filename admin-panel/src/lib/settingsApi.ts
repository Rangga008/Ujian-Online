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

export interface CreateSettingDto {
	key: string;
	value: string;
	type: "text" | "number" | "boolean" | "image" | "color" | "json";
	group: string;
	label: string;
	description?: string;
	isPublic?: boolean;
}

export interface UpdateSettingDto {
	value?: string;
	label?: string;
	description?: string;
	isPublic?: boolean;
}

export interface BulkUpdateSettingsDto {
	settings: Array<{
		key: string;
		value: string;
	}>;
}

const settingsApi = {
	// Get all settings (admin only)
	getAll: async (): Promise<Setting[]> => {
		const response = await api.get("/settings");
		return response.data;
	},

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

	// Create new setting
	create: async (data: CreateSettingDto): Promise<Setting> => {
		const response = await api.post("/settings", data);
		return response.data;
	},

	// Update setting by key
	updateByKey: async (
		key: string,
		data: UpdateSettingDto
	): Promise<Setting> => {
		const response = await api.patch(`/settings/${key}`, data);
		return response.data;
	},

	// Bulk update settings
	bulkUpdate: async (data: BulkUpdateSettingsDto): Promise<Setting[]> => {
		const response = await api.patch("/settings/bulk", data);
		return response.data;
	},

	// Delete setting by key
	delete: async (key: string): Promise<void> => {
		await api.delete(`/settings/${key}`);
	},

	// Initialize default settings
	initializeDefaults: async (): Promise<Setting[]> => {
		const response = await api.post("/settings/initialize");
		return response.data;
	},

	// Upload favicon
	uploadFavicon: async (file: File): Promise<{ path: string }> => {
		const formData = new FormData();
		formData.append("file", file);
		const response = await api.post("/settings/upload/favicon", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return response.data;
	},

	// Upload logo
	uploadLogo: async (file: File): Promise<{ path: string }> => {
		const formData = new FormData();
		formData.append("file", file);
		const response = await api.post("/settings/upload/logo", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return response.data;
	},
};

export default settingsApi;
