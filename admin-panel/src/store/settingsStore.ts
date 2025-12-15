import { create } from "zustand";
import settingsApi, { Setting } from "@/lib/settingsApi";

interface SettingsState {
	settings: Setting[];
	settingsObject: Record<string, any>;
	loading: boolean;
	error: string | null;
	fetchSettings: () => Promise<void>;
	fetchSettingsObject: () => Promise<void>;
	updateSetting: (key: string, value: string) => Promise<void>;
	bulkUpdateSettings: (updates: Record<string, string>) => Promise<void>;
	getSettingValue: (key: string, defaultValue?: any) => any;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	settings: [],
	settingsObject: {},
	loading: false,
	error: null,

	fetchSettings: async () => {
		set({ loading: true, error: null });
		try {
			const data = await settingsApi.getAll();
			set({ settings: data, loading: false });
		} catch (error: any) {
			set({
				error: error.response?.data?.message || "Failed to fetch settings",
				loading: false,
			});
		}
	},

	fetchSettingsObject: async () => {
		try {
			// Try to get full object (requires auth), fallback to public
			try {
				const data = await settingsApi.getAsObject();
				set({ settingsObject: data });
			} catch (authError: any) {
				// If unauthorized or any error, fetch public settings only
				if (
					authError.response?.status === 401 ||
					authError.code === "ECONNABORTED" ||
					authError.code === "ERR_BAD_REQUEST"
				) {
					console.log("[SettingsStore] Fetching public settings only");
					try {
						const publicSettings = await settingsApi.getPublic();
						// Backend returns object directly, not array
						if (
							typeof publicSettings === "object" &&
							!Array.isArray(publicSettings)
						) {
							set({ settingsObject: publicSettings });
						} else {
							// If it's array format (old API)
							const publicObject: Record<string, any> = {};
							(publicSettings as any[]).forEach((setting) => {
								publicObject[setting.key] = setting.value;
							});
							set({ settingsObject: publicObject });
						}
					} catch (publicError: any) {
						console.error(
							"[SettingsStore] Failed to fetch public settings:",
							publicError
						);
						// Set default values if all fails
						set({
							settingsObject: {
								"app.name": "Admin Panel",
								"app.description": "Portal administrasi ujian online",
								"app.favicon": "/favicon.ico",
							},
						});
					}
				} else {
					throw authError;
				}
			}
		} catch (error: any) {
			console.error("Failed to fetch settings object:", error);
			// Ensure we always have some default values
			if (Object.keys(get().settingsObject).length === 0) {
				set({
					settingsObject: {
						"app.name": "Admin Panel",
						"app.description": "Portal administrasi ujian online",
						"app.favicon": "/favicon.ico",
					},
				});
			}
		}
	},

	updateSetting: async (key: string, value: string) => {
		set({ loading: true, error: null });
		try {
			await settingsApi.updateByKey(key, { value });
			await get().fetchSettings();
			await get().fetchSettingsObject();
		} catch (error: any) {
			set({
				error: error.response?.data?.message || "Failed to update setting",
				loading: false,
			});
			throw error;
		}
	},

	bulkUpdateSettings: async (updates: Record<string, string>) => {
		set({ loading: true, error: null });
		try {
			await settingsApi.bulkUpdate({ settings: updates });
			await get().fetchSettings();
			await get().fetchSettingsObject();
		} catch (error: any) {
			set({
				error: error.response?.data?.message || "Failed to update settings",
				loading: false,
			});
			throw error;
		}
	},

	getSettingValue: (key: string, defaultValue: any = null) => {
		const { settingsObject } = get();
		return settingsObject[key] ?? defaultValue;
	},
}));
