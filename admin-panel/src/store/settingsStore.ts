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
	bulkUpdateSettings: (
		updates: Array<{ key: string; value: string }>
	) => Promise<void>;
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
			const data = await settingsApi.getAsObject();
			set({ settingsObject: data });
		} catch (error: any) {
			console.error("Failed to fetch settings object:", error);
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

	bulkUpdateSettings: async (
		updates: Array<{ key: string; value: string }>
	) => {
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
