import { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { isPageAccessible } from "@/lib/authGuard";
import settingsApi, { Setting } from "@/lib/settingsApi";
import subjectsApi, { Subject } from "@/lib/subjectsApi";
import gradesApi, { Grade } from "@/lib/gradesApi";
import { getImageUrl } from "@/lib/imageUrl";
import toast from "react-hot-toast";

export default function SettingsPage() {
	const router = useRouter();
	const { user } = useAuthStore();

	useEffect(() => {
		if (user && !isPageAccessible("/settings", user.role)) {
			router.push("/dashboard");
		}
	}, [user, router]);

	const [settings, setSettings] = useState<Setting[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [grades, setGrades] = useState<Grade[]>([]);
	const [activeTab, setActiveTab] = useState("general");
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [uploadingFavicon, setUploadingFavicon] = useState(false);
	const [showSubjectModal, setShowSubjectModal] = useState(false);
	const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
	const [subjectFormData, setSubjectFormData] = useState({
		name: "",
		code: "",
		description: "",
		color: "#3B82F6",
		isActive: true,
	});
	const [loadingSubjects, setLoadingSubjects] = useState(false);
	const [savingSubject, setSavingSubject] = useState(false);
	const [showGradeModal, setShowGradeModal] = useState(false);
	const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
	const [gradeFormData, setGradeFormData] = useState({
		level: 1,
		name: "",
		section: "SD" as "SD" | "SMP" | "SMA",
		isActive: true,
	});
	const [loadingGrades, setLoadingGrades] = useState(false);
	const [savingGrade, setSavingGrade] = useState(false);
	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean;
		id: number | null;
		type: "subject" | "grade";
	}>({
		isOpen: false,
		id: null,
		type: "subject",
	});

	useEffect(() => {
		fetchSettings();
		fetchSubjects();
		fetchGrades();
	}, []);

	const fetchSubjects = async () => {
		try {
			setLoadingSubjects(true);
			const data = await subjectsApi.getAll();
			setSubjects(data);
		} catch (error) {
			toast.error("Gagal memuat mata pelajaran");
		} finally {
			setLoadingSubjects(false);
		}
	};

	const fetchGrades = async () => {
		try {
			setLoadingGrades(true);
			const data = await gradesApi.getAll();
			setGrades(data.sort((a, b) => a.level - b.level));
		} catch (error) {
			toast.error("Gagal memuat angkatan");
		} finally {
			setLoadingGrades(false);
		}
	};

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
		{ id: "subjects", label: "Mata Pelajaran", icon: "📚" },
		{ id: "grades", label: "Angkatan", icon: "🎓" },
	];

	const handleInputChange = (key: string, value: string) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	// Check if there are any changes compared to current settings
	const hasChanges = () => {
		return Object.entries(formData).some(([key, value]) => {
			const original = settings.find((s) => s.key === key);
			return original && original.value !== value;
		});
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const updates = Object.entries(formData)
				.filter(([key, value]) => {
					const original = settings.find((s) => s.key === key);
					return original && original.value !== value;
				})
				.reduce((acc, [key, value]) => {
					acc[key] = value;
					return acc;
				}, {} as Record<string, string>);

			if (Object.keys(updates).length === 0) {
				toast.success("Tidak ada perubahan untuk disimpan");
				return;
			}

			try {
				// Kirim sebagai object {key: value}, bukan array
				await settingsApi.bulkUpdate({
					settings: updates,
				});
				await fetchSettings();
				toast.success(
					`${Object.keys(updates).length} pengaturan berhasil disimpan!`
				);
			} catch (error: any) {
				console.error("Bulk update error:", error);
				throw error;
			}
		} catch (error: any) {
			console.error("Save error:", error);
			const errorMsg =
				error.response?.data?.message ||
				error.message ||
				"Gagal menyimpan pengaturan";
			toast.error(errorMsg);
		} finally {
			setIsSaving(false);
		}
	};

	const handleLogoUpload = async (file: File) => {
		setUploadingLogo(true);
		try {
			const result = await settingsApi.uploadLogo(file);
			if (!result.path) throw new Error("No path returned from upload");

			// Construct full URL menggunakan helper
			const fullPath = getImageUrl(result.path);

			// Update setting di database
			const updateResult = await settingsApi.updateByKey("app.logo", {
				value: fullPath,
			});

			if (updateResult && updateResult.id) {
				// Update settings state dengan response dari backend
				setSettings((prev) =>
					prev.map((s) => (s.key === "app.logo" ? updateResult : s))
				);
				// Update form data
				setFormData((prev) => ({ ...prev, "app.logo": fullPath }));
				toast.success("✓ Logo berhasil diupload dan disimpan!");
			} else {
				throw new Error("Failed to save logo");
			}
		} catch (error: any) {
			console.error("Logo upload error:", error);
			toast.error(
				error.response?.data?.message ||
					error.message ||
					"Gagal mengupload logo"
			);
		} finally {
			setUploadingLogo(false);
		}
	};

	const handleFaviconUpload = async (file: File) => {
		setUploadingFavicon(true);
		try {
			const result = await settingsApi.uploadFavicon(file);
			if (!result.path) throw new Error("No path returned from upload");

			// Construct full URL menggunakan helper
			const fullPath = getImageUrl(result.path);

			// Update setting di database
			const updateResult = await settingsApi.updateByKey("app.favicon", {
				value: fullPath,
			});

			if (updateResult && updateResult.id) {
				// Update settings state dengan response dari backend
				setSettings((prev) =>
					prev.map((s) => (s.key === "app.favicon" ? updateResult : s))
				);
				// Update form data
				setFormData((prev) => ({ ...prev, "app.favicon": fullPath }));
				toast.success("✓ Favicon berhasil diupload dan disimpan!");

				// Force update favicon in browser
				if (typeof window !== "undefined") {
					const link = document.querySelector(
						"link[rel~='icon']"
					) as HTMLLinkElement;
					if (link) {
						link.href = fullPath + "?v=" + Date.now();
					}
				}
			} else {
				throw new Error("Failed to save favicon");
			}
		} catch (error: any) {
			console.error("Favicon upload error:", error);
			toast.error(
				error.response?.data?.message ||
					error.message ||
					"Gagal mengupload favicon"
			);
		} finally {
			setUploadingFavicon(false);
		}
	};

	// Subject Management Functions
	const handleAddSubject = () => {
		setEditingSubject(null);
		setSubjectFormData({
			name: "",
			code: "",
			description: "",
			color: "#3B82F6",
			isActive: true,
		});
		setShowSubjectModal(true);
	};

	const handleEditSubject = (subject: Subject) => {
		setEditingSubject(subject);
		setSubjectFormData({
			name: subject.name,
			code: subject.code,
			description: subject.description || "",
			color: subject.color || "#3B82F6",
			isActive: subject.isActive,
		});
		setShowSubjectModal(true);
	};

	const handleSaveSubject = async () => {
		if (!subjectFormData.name.trim() || !subjectFormData.code.trim()) {
			toast.error("Nama dan Kode mata pelajaran harus diisi");
			return;
		}

		setSavingSubject(true);
		try {
			if (editingSubject) {
				await subjectsApi.update(editingSubject.id, {
					name: subjectFormData.name,
					code: subjectFormData.code,
					description: subjectFormData.description,
					color: subjectFormData.color,
					isActive: subjectFormData.isActive,
				});
				toast.success("Mata pelajaran berhasil diperbarui!");
			} else {
				await subjectsApi.create({
					name: subjectFormData.name,
					code: subjectFormData.code,
					description: subjectFormData.description,
					color: subjectFormData.color,
					isActive: subjectFormData.isActive,
				});
				toast.success("Mata pelajaran berhasil ditambahkan!");
			}
			setShowSubjectModal(false);
			fetchSubjects();
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || "Gagal menyimpan mata pelajaran"
			);
		} finally {
			setSavingSubject(false);
		}
	};

	const handleDeleteSubjectConfirm = async () => {
		if (!deleteModal.id || deleteModal.type !== "subject") return;

		try {
			await subjectsApi.delete(deleteModal.id);
			toast.success("Mata pelajaran berhasil dihapus!");
			setDeleteModal({ isOpen: false, id: null, type: "subject" });
			fetchSubjects();
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || "Gagal menghapus mata pelajaran"
			);
			setDeleteModal({ isOpen: false, id: null, type: "subject" });
		}
	};

	const handleDeleteSubject = (id: number) => {
		setDeleteModal({ isOpen: true, id, type: "subject" });
	};

	const handleToggleSubjectActive = async (id: number, isActive: boolean) => {
		try {
			await subjectsApi.update(id, { isActive: !isActive });
			await fetchSubjects();
			toast.success(
				!isActive ? "Mata pelajaran diaktifkan" : "Mata pelajaran dinonaktifkan"
			);
		} catch (error: any) {
			toast.error("Gagal mengubah status mata pelajaran");
		}
	};

	// Grade Management Functions
	const handleAddGrade = () => {
		setEditingGrade(null);
		setGradeFormData({
			level: 1,
			name: "",
			section: "SD",
			isActive: true,
		});
		setShowGradeModal(true);
	};

	const handleEditGrade = (grade: Grade) => {
		setEditingGrade(grade);
		setGradeFormData({
			level: grade.level,
			name: grade.name,
			section: grade.section,
			isActive: grade.isActive,
		});
		setShowGradeModal(true);
	};

	const handleSaveGrade = async () => {
		if (!gradeFormData.name.trim()) {
			toast.error("Nama angkatan harus diisi");
			return;
		}

		setSavingGrade(true);
		try {
			if (editingGrade) {
				await gradesApi.update(editingGrade.id, {
					level: gradeFormData.level,
					name: gradeFormData.name,
					section: gradeFormData.section,
					isActive: gradeFormData.isActive,
				});
				toast.success("Angkatan berhasil diperbarui!");
			} else {
				await gradesApi.create({
					level: gradeFormData.level,
					name: gradeFormData.name,
					section: gradeFormData.section,
					isActive: gradeFormData.isActive,
				});
				toast.success("Angkatan berhasil ditambahkan!");
			}
			setShowGradeModal(false);
			fetchGrades();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menyimpan angkatan");
		} finally {
			setSavingGrade(false);
		}
	};

	const handleDeleteGradeConfirm = async () => {
		if (!deleteModal.id || deleteModal.type !== "grade") return;

		try {
			await gradesApi.delete(deleteModal.id);
			toast.success("Angkatan berhasil dihapus!");
			setDeleteModal({ isOpen: false, id: null, type: "grade" });
			fetchGrades();
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal menghapus angkatan");
			setDeleteModal({ isOpen: false, id: null, type: "grade" });
		}
	};

	const handleDeleteGrade = (id: number) => {
		setDeleteModal({ isOpen: true, id, type: "grade" });
	};

	const handleToggleGradeActive = async (id: number, isActive: boolean) => {
		try {
			await gradesApi.update(id, { isActive: !isActive });
			await fetchGrades();
			toast.success(
				!isActive ? "Angkatan diaktifkan" : "Angkatan dinonaktifkan"
			);
		} catch (error: any) {
			toast.error("Gagal mengubah status angkatan");
		}
	};

	const getGradeSectionLabel = (section: string) => {
		const labels: Record<string, string> = {
			SD: "Sekolah Dasar",
			SMP: "Sekolah Menengah Pertama",
			SMA: "Sekolah Menengah Atas",
		};
		return labels[section] || section;
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
			<Layout title="Pengaturan">
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout title="Pengaturan">
			<Head>
				<title>Pengaturan - Admin Panel</title>
			</Head>
			<div className="space-y-6 px-2 sm:px-0">
				{/* Header */}
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
						Pengaturan
					</h1>
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
					{activeTab === "subjects" ? (
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<div>
									<h2 className="text-xl font-bold text-gray-900">
										Manajemen Mata Pelajaran
									</h2>
									<p className="text-sm text-gray-600 mt-1">
										Tambah, edit, atau hapus mata pelajaran yang tersedia
									</p>
								</div>
								<button onClick={handleAddSubject} className="btn btn-primary">
									+ Tambah Mata Pelajaran
								</button>
							</div>

							{loadingSubjects ? (
								<div className="text-center py-8 text-gray-500">Loading...</div>
							) : subjects.length === 0 ? (
								<div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
									<p>Belum ada mata pelajaran</p>
									<p className="text-sm mt-1">
										Klik "Tambah Mata Pelajaran" untuk memulai
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="table">
										<thead>
											<tr>
												<th>Warna</th>
												<th>Nama Mata Pelajaran</th>
												<th>Kode</th>
												<th>Deskripsi</th>
												<th>Status</th>
												<th>Aksi</th>
											</tr>
										</thead>
										<tbody>
											{subjects.map((subject) => (
												<tr key={subject.id}>
													<td>
														<div className="flex items-center gap-2">
															<div
																className="w-6 h-6 rounded border border-gray-200"
																style={{
																	backgroundColor: subject.color || "#3B82F6",
																}}
															/>
														</div>
													</td>
													<td className="font-medium">{subject.name}</td>
													<td>
														<span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
															{subject.code}
														</span>
													</td>
													<td className="text-sm text-gray-600">
														{subject.description || "-"}
													</td>
													<td>
														<button
															onClick={() =>
																handleToggleSubjectActive(
																	subject.id,
																	subject.isActive
																)
															}
															className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
																subject.isActive
																	? "bg-green-100 text-green-800 hover:bg-green-200"
																	: "bg-gray-100 text-gray-800 hover:bg-gray-200"
															}`}
														>
															{subject.isActive ? "Aktif" : "Nonaktif"}
														</button>
													</td>
													<td>
														<div className="flex gap-2">
															<button
																onClick={() => handleEditSubject(subject)}
																className="btn btn-secondary btn-sm"
															>
																Edit
															</button>
															<button
																onClick={() => handleDeleteSubject(subject.id)}
																className="btn btn-danger btn-sm"
															>
																Hapus
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					) : activeTab === "grades" ? (
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<div>
									<h2 className="text-xl font-bold text-gray-900">
										Manajemen Angkatan
									</h2>
									<p className="text-sm text-gray-600 mt-1">
										Kelola angkatan siswa (SD, SMP, SMA)
									</p>
								</div>
								<button onClick={handleAddGrade} className="btn btn-primary">
									+ Tambah Angkatan
								</button>
							</div>

							{loadingGrades ? (
								<div className="text-center py-8 text-gray-500">Loading...</div>
							) : grades.length === 0 ? (
								<div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
									<p>Belum ada angkatan</p>
									<p className="text-sm mt-1">
										Klik "Tambah Angkatan" untuk memulai
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="table">
										<thead>
											<tr>
												<th>Level</th>
												<th>Nama Angkatan</th>
												<th>Sekolah</th>
												<th>Status</th>
												<th>Aksi</th>
											</tr>
										</thead>
										<tbody>
											{grades.map((grade) => (
												<tr key={grade.id}>
													<td className="font-bold">
														<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
															{grade.level}
														</span>
													</td>
													<td className="font-medium">{grade.name}</td>
													<td>
														<span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm">
															{getGradeSectionLabel(grade.section)}
														</span>
													</td>
													<td>
														<button
															onClick={() =>
																handleToggleGradeActive(
																	grade.id,
																	grade.isActive
																)
															}
															className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
																grade.isActive
																	? "bg-green-100 text-green-800 hover:bg-green-200"
																	: "bg-gray-100 text-gray-800 hover:bg-gray-200"
															}`}
														>
															{grade.isActive ? "Aktif" : "Nonaktif"}
														</button>
													</td>
													<td>
														<div className="flex gap-2">
															<button
																onClick={() => handleEditGrade(grade)}
																className="btn btn-secondary btn-sm"
															>
																Edit
															</button>
															<button
																onClick={() => handleDeleteGrade(grade.id)}
																className="btn btn-danger btn-sm"
															>
																Hapus
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					) : (
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
					)}

					{/* Save Button - hanya untuk tab settings, bukan subjects atau grades */}
					{activeTab !== "subjects" && activeTab !== "grades" && (
						<div className="mt-6 pt-6 border-t flex justify-end">
							<button
								onClick={handleSave}
								disabled={isSaving || !hasChanges()}
								className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
								title={
									!hasChanges() ? "Tidak ada perubahan" : "Simpan perubahan"
								}
							>
								{isSaving ? "Menyimpan..." : "Simpan Perubahan"}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Subject Modal */}
			{showSubjectModal && (
				<div
					className="modal-overlay"
					onClick={() => setShowSubjectModal(false)}
				>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="text-xl font-bold">
								{editingSubject
									? "Edit Mata Pelajaran"
									: "Tambah Mata Pelajaran"}
							</h2>
							<button
								onClick={() => setShowSubjectModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>

						<div className="modal-body space-y-4">
							<div className="form-group">
								<label className="form-label">Nama Mata Pelajaran *</label>
								<input
									type="text"
									className="form-input"
									value={subjectFormData.name}
									onChange={(e) =>
										setSubjectFormData({
											...subjectFormData,
											name: e.target.value,
										})
									}
									placeholder="Contoh: Matematika"
									required
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Kode Mata Pelajaran *</label>
								<input
									type="text"
									className="form-input"
									value={subjectFormData.code}
									onChange={(e) =>
										setSubjectFormData({
											...subjectFormData,
											code: e.target.value.toUpperCase(),
										})
									}
									placeholder="Contoh: MTK"
									maxLength={10}
									required
								/>
								<p className="text-xs text-gray-500 mt-1">
									Kode unik untuk mengidentifikasi mata pelajaran (maks 10
									karakter)
								</p>
							</div>

							<div className="form-group">
								<label className="form-label">Deskripsi</label>
								<textarea
									className="form-input"
									value={subjectFormData.description}
									onChange={(e) =>
										setSubjectFormData({
											...subjectFormData,
											description: e.target.value,
										})
									}
									rows={3}
									placeholder="Deskripsi mata pelajaran (opsional)"
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Warna</label>
								<div className="flex gap-3">
									<input
										type="color"
										value={subjectFormData.color}
										onChange={(e) =>
											setSubjectFormData({
												...subjectFormData,
												color: e.target.value,
											})
										}
										className="w-16 h-10 rounded cursor-pointer"
									/>
									<div className="flex-1">
										<input
											type="text"
											className="form-input"
											value={subjectFormData.color}
											onChange={(e) =>
												setSubjectFormData({
													...subjectFormData,
													color: e.target.value,
												})
											}
											placeholder="#3B82F6"
										/>
									</div>
									<div
										className="w-16 h-10 rounded border-2 border-gray-200"
										style={{
											backgroundColor: subjectFormData.color,
										}}
									/>
								</div>
								<p className="text-xs text-gray-500 mt-1">
									Pilih warna untuk membedakan mata pelajaran
								</p>
							</div>

							<div className="form-group">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={subjectFormData.isActive}
										onChange={(e) =>
											setSubjectFormData({
												...subjectFormData,
												isActive: e.target.checked,
											})
										}
										className="w-4 h-4 text-blue-600 rounded focus:ring-2"
									/>
									<span className="text-sm text-gray-700">
										Aktifkan Mata Pelajaran
									</span>
								</label>
								<p className="text-xs text-gray-500 mt-1">
									Mata pelajaran aktif dapat dipilih saat membuat kelas dan
									ujian
								</p>
							</div>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								onClick={() => setShowSubjectModal(false)}
								className="btn btn-secondary"
							>
								Batal
							</button>
							<button
								onClick={handleSaveSubject}
								disabled={savingSubject}
								className="btn btn-primary disabled:opacity-50"
							>
								{savingSubject
									? "Menyimpan..."
									: editingSubject
									? "Simpan Perubahan"
									: "Tambah Mata Pelajaran"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Grade Modal */}
			{showGradeModal && (
				<div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="text-xl font-bold">
								{editingGrade ? "Edit Angkatan" : "Tambah Angkatan"}
							</h2>
							<button
								onClick={() => setShowGradeModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>

						<div className="modal-body space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="form-group">
									<label className="form-label">Level Angkatan *</label>
									<select
										className="form-input"
										value={gradeFormData.level}
										onChange={(e) =>
											setGradeFormData({
												...gradeFormData,
												level: parseInt(e.target.value),
											})
										}
										required
									>
										{Array.from({ length: 12 }, (_, i) => i + 1).map(
											(level) => (
												<option key={level} value={level}>
													Kelas {level}
												</option>
											)
										)}
									</select>
									<p className="text-xs text-gray-500 mt-1">
										Pilih level 1-6 untuk SD, 7-9 untuk SMP, 10-12 untuk SMA
									</p>
								</div>

								<div className="form-group">
									<label className="form-label">Sekolah *</label>
									<select
										className="form-input"
										value={gradeFormData.section}
										onChange={(e) =>
											setGradeFormData({
												...gradeFormData,
												section: e.target.value as "SD" | "SMP" | "SMA",
											})
										}
										required
									>
										<option value="SD">Sekolah Dasar (SD)</option>
										<option value="SMP">Sekolah Menengah Pertama (SMP)</option>
										<option value="SMA">Sekolah Menengah Atas (SMA)</option>
									</select>
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Nama Angkatan *</label>
								<input
									type="text"
									className="form-input"
									value={gradeFormData.name}
									onChange={(e) =>
										setGradeFormData({
											...gradeFormData,
											name: e.target.value,
										})
									}
									placeholder="Contoh: Kelas 1 Sekolah Dasar"
									required
								/>
								<p className="text-xs text-gray-500 mt-1">
									Nama yang akan ditampilkan di sistem
								</p>
							</div>

							<div className="form-group">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={gradeFormData.isActive}
										onChange={(e) =>
											setGradeFormData({
												...gradeFormData,
												isActive: e.target.checked,
											})
										}
										className="w-4 h-4 text-blue-600 rounded focus:ring-2"
									/>
									<span className="text-sm text-gray-700">
										Aktifkan Angkatan
									</span>
								</label>
								<p className="text-xs text-gray-500 mt-1">
									Angkatan aktif dapat dipilih saat membuat kelas dan ujian
								</p>
							</div>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								onClick={() => setShowGradeModal(false)}
								className="btn btn-secondary"
							>
								Batal
							</button>
							<button
								onClick={handleSaveGrade}
								disabled={savingGrade}
								className="btn btn-primary disabled:opacity-50"
							>
								{savingGrade
									? "Menyimpan..."
									: editingGrade
									? "Simpan Perubahan"
									: "Tambah Angkatan"}
							</button>
						</div>
					</div>
				</div>
			)}

			<ConfirmationModal
				isOpen={deleteModal.isOpen && deleteModal.type === "subject"}
				title="Hapus Mata Pelajaran"
				message="Yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat dibatalkan."
				confirmText="Hapus"
				cancelText="Batal"
				isDangerous={true}
				onConfirm={handleDeleteSubjectConfirm}
				onCancel={() =>
					setDeleteModal({ isOpen: false, id: null, type: "subject" })
				}
			/>

			<ConfirmationModal
				isOpen={deleteModal.isOpen && deleteModal.type === "grade"}
				title="Hapus Angkatan"
				message="Yakin ingin menghapus angkatan ini? Tindakan ini tidak dapat dibatalkan."
				confirmText="Hapus"
				cancelText="Batal"
				isDangerous={true}
				onConfirm={handleDeleteGradeConfirm}
				onCancel={() =>
					setDeleteModal({ isOpen: false, id: null, type: "grade" })
				}
			/>
		</Layout>
	);
}
