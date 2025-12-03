import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import settingsApi, { Setting } from "@/lib/settingsApi";
import toast from "react-hot-toast";

export default function SettingsPage() {
	const [settings, setSettings] = useState<Setting[]>([]);
	const [activeTab, setActiveTab] = useState("general");
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [uploadingFavicon, setUploadingFavicon] = useState(false);

	useEffect(() => {
		fetchSettings();
	}, []);

	useEffect(() => {
		// Initialize form data from settings
		const data: Record<string, string> = {};
		settings.forEach((setting) => {
			data[setting.key] = setting.value;
		});
		setFormData(data);
	}, [settings]);

	const fetchSettings = async () => {
		try {
			const data = await settingsApi.getAll();
			setSettings(data);
		} catch (error) {
			toast.error("Gagal memuat pengaturan");
		} finally {
			setLoading(false);
		}
	};

	const groupedSettings = settings.reduce((acc, setting) => {
		if (!acc[setting.group]) {
			acc[setting.group] = [];
		}
		acc[setting.group].push(setting);
		return acc;
	}, {} as Record<string, Setting[]>);

	const tabs = [
		{ id: "general", label: "Umum", icon: "⚙️" },
		{ id: "appearance", label: "Tampilan", icon: "🎨" },
		{ id: "school", label: "Sekolah", icon: "🏫" },
		{ id: "exam", label: "Ujian", icon: "📝" },
	];

	const handleInputChange = (key: string, value: string) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const updates = Object.entries(formData)
				.filter(([key, value]) => {
					const original = settings.find((s) => s.key === key);
					return original && original.value !== value;
				})
				.map(([key, value]) => ({ key, value }));

			if (updates.length > 0) {
				await settingsApi.bulkUpdate({ settings: updates });
				await fetchSettings();
				toast.success("Pengaturan berhasil disimpan!");
			} else {
				toast.success("Tidak ada perubahan");
			}
		} catch (error) {
			toast.error("Gagal menyimpan pengaturan");
		} finally {
			setIsSaving(false);
		}
	};

	const handleLogoUpload = async (file: File) => {
		setUploadingLogo(true);
		try {
			const result = await settingsApi.uploadLogo(file);
			toast.success("Logo berhasil diupload!");
			await fetchSettings();
			// Update form data with new logo path
			setFormData((prev) => ({ ...prev, "app.logo": result.path }));
		} catch (error) {
			toast.error("Gagal mengupload logo");
		} finally {
			setUploadingLogo(false);
		}
	};

	const handleFaviconUpload = async (file: File) => {
		setUploadingFavicon(true);
		try {
			const result = await settingsApi.uploadFavicon(file);
			toast.success("Favicon berhasil diupload!");
			await fetchSettings();
			setFormData((prev) => ({ ...prev, "app.favicon": result.path }));
		} catch (error) {
			toast.error("Gagal mengupload favicon");
		} finally {
			setUploadingFavicon(false);
		}
	};

	const renderInput = (setting: Setting) => {
		const value = formData[setting.key] || "";

		// Hide dark mode logo (locked)
		if (
			setting.key === "app.logo_dark" ||
			setting.key === "app.logo_dark_locked"
		) {
			return null;
		}

		switch (setting.type) {
			case "boolean":
				return (
					<label className="flex items-center space-x-3 cursor-pointer">
						<input
							type="checkbox"
							checked={value === "true"}
							onChange={(e) =>
								handleInputChange(
									setting.key,
									e.target.checked ? "true" : "false"
								)
							}
							className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
						/>
						<span className="text-sm text-gray-600">
							{value === "true" ? "Aktif" : "Nonaktif"}
						</span>
					</label>
				);

			case "color":
				return (
					<div className="flex items-center space-x-3">
						<input
							type="color"
							value={value}
							onChange={(e) => handleInputChange(setting.key, e.target.value)}
							className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
						/>
						<input
							type="text"
							value={value}
							onChange={(e) => handleInputChange(setting.key, e.target.value)}
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="#000000"
						/>
					</div>
				);

			case "number":
				return (
					<input
						type="number"
						value={value}
						onChange={(e) => handleInputChange(setting.key, e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				);

			case "image":
				const isLogo = setting.key === "app.logo";
				const isFavicon = setting.key === "app.favicon";
				const isUploading = isLogo
					? uploadingLogo
					: isFavicon
					? uploadingFavicon
					: false;

				return (
					<div className="space-y-3">
						<div className="flex items-center space-x-3">
							<input
								type="text"
								value={value}
								onChange={(e) => handleInputChange(setting.key, e.target.value)}
								className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="/images/logo.png"
							/>
							{(isLogo || isFavicon) && (
								<label className="btn btn-secondary cursor-pointer whitespace-nowrap">
									{isUploading ? "Uploading..." : "Upload File"}
									<input
										type="file"
										accept="image/*"
										className="hidden"
										disabled={isUploading}
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												if (isLogo) handleLogoUpload(file);
												else if (isFavicon) handleFaviconUpload(file);
											}
										}}
									/>
								</label>
							)}
						</div>
						{value && (
							<div className="p-4 bg-gray-50 rounded-lg">
								<p className="text-xs text-gray-500 mb-2">Preview:</p>
								<img
									src={value}
									alt="Preview"
									className="max-w-xs max-h-32 object-contain"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
							</div>
						)}
					</div>
				);

			case "json":
				return (
					<textarea
						value={value}
						onChange={(e) => handleInputChange(setting.key, e.target.value)}
						rows={4}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
						placeholder='{"key": "value"}'
					/>
				);

			default:
				return (
					<input
						type="text"
						value={value}
						onChange={(e) => handleInputChange(setting.key, e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				);
		}
	};

	if (loading) {
		return (
			<Layout>
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
					<p className="text-gray-600 mt-2">
						Kelola pengaturan aplikasi, tampilan, dan konfigurasi sekolah
					</p>
				</div>

				{/* Tabs */}
				<div className="border-b border-gray-200">
					<nav className="flex space-x-8">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
									activeTab === tab.id
										? "border-primary-500 text-primary-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								<span className="mr-2">{tab.icon}</span>
								{tab.label}
							</button>
						))}
					</nav>
				</div>

				{/* Settings Form */}
				<div className="card">
					<div className="space-y-6">
						{groupedSettings[activeTab]
							?.filter((setting) => {
								// Filter out hidden settings
								return (
									setting.key !== "app.logo_dark" &&
									setting.key !== "app.logo_dark_locked"
								);
							})
							.map((setting) => (
								<div key={setting.key} className="space-y-2">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<label className="block text-sm font-medium text-gray-700">
												{setting.label}
											</label>
											{setting.description && (
												<p className="text-xs text-gray-500 mt-1">
													{setting.description}
												</p>
											)}
										</div>
										{setting.isPublic && (
											<span className="ml-4 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
												Public
											</span>
										)}
									</div>
									<div className="mt-2">{renderInput(setting)}</div>
								</div>
							))}

						{!groupedSettings[activeTab]?.length && (
							<div className="text-center py-12 text-gray-500">
								<p>Tidak ada pengaturan di kategori ini</p>
							</div>
						)}
					</div>

					{/* Save Button */}
					<div className="mt-6 pt-6 border-t flex justify-end">
						<button
							onClick={handleSave}
							disabled={isSaving}
							className="btn btn-primary disabled:opacity-50"
						>
							{isSaving ? "Menyimpan..." : "Simpan Perubahan"}
						</button>
					</div>
				</div>
			</div>
		</Layout>
	);
}
