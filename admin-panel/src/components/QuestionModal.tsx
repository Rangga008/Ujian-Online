import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface QuestionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (questionData: any) => Promise<void>;
	initialData?: {
		id?: number | string; // Include ID for existing questions
		questionText: string;
		type: string;
		points: number;
		options: string[];
		correctAnswer: string;
		imageUrl?: string;
		allowPhotoAnswer?: boolean;
	};
	isEditing?: boolean;
}

const QuestionTypes = [
	{ value: "multiple_choice", label: "Pilihan Ganda" },
	{ value: "mixed_multiple_choice", label: "Pilihan Ganda Majemuk" },
	{ value: "true_false", label: "Benar/Salah" },
	{ value: "essay", label: "Essay" },
];

export default function QuestionModal({
	isOpen,
	onClose,
	onSave,
	initialData,
	isEditing = false,
}: QuestionModalProps) {
	const [formData, setFormData] = useState({
		id: undefined as number | string | undefined, // Store ID for existing questions
		questionText: "",
		type: "multiple_choice",
		points: 1,
		options: ["", "", "", ""],
		correctAnswer: "",
		imageFile: null as File | null,
		imageUrl: "",
		allowPhotoAnswer: false,
		optionImages: undefined as string[] | undefined, // Store option image URLs from DB
	});
	const [saving, setSaving] = useState(false);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [optionImages, setOptionImages] = useState<(File | null)[]>([
		null,
		null,
		null,
		null,
		null,
	]);
	const [optionImagePreviews, setOptionImagePreviews] = useState<string[]>([
		"",
		"",
		"",
		"",
		"",
	]);

	useEffect(() => {
		if (!isOpen) return;

		if (initialData) {
			// Normalize correctAnswer to always use indices
			let corrected = "";

			// Initialize allowPhotoAnswer if provided
			const allowPhotoAnswer = (initialData as any).allowPhotoAnswer || false;

			if (initialData.type === "mixed_multiple_choice" && initialData.options) {
				// For mixed_multiple_choice, correctAnswer should be indices (e.g., "0,2,4")
				let parts = (initialData.correctAnswer || "")
					.split(/[,;|\/\s]+/)
					.map((p: string) => p.trim())
					.filter(Boolean);

				// Ensure all parts are valid numeric indices
				const indices = parts
					.map((text) => {
						// Try to convert to number
						if (/^\d+$/.test(text)) {
							const num = Number(text);
							if (num >= 0 && num < (initialData.options?.length || 0)) {
								return num;
							}
						}
						// If not a valid index, try matching against option text
						const normalize = (s: string) =>
							(s || "").toString().replace(/\s+/g, " ").trim();
						const lowerOptions = (initialData.options || []).map((o: string) =>
							normalize(o).toLowerCase()
						);
						const t = normalize(text).toLowerCase();
						const idx = lowerOptions.indexOf(t);
						return idx >= 0 ? idx : -1;
					})
					.filter((i: number) => i >= 0);

				corrected = indices.length > 0 ? indices.join(",") : "";
			} else if (
				initialData.type === "multiple_choice" &&
				initialData.options
			) {
				// For single-choice, always ensure we have a valid index
				const rawCA = String(initialData.correctAnswer || "").trim();

				if (rawCA) {
					// Check if it's already a numeric index
					if (/^\d+$/.test(rawCA)) {
						const idx = Number(rawCA);
						if (idx >= 0 && idx < initialData.options.length) {
							corrected = String(idx);
						}
					} else {
						// Try to find the index of this text option
						const normalize = (s: string) =>
							(s || "").toString().replace(/\s+/g, " ").trim();
						const lowerOptions = (initialData.options || []).map((o: string) =>
							normalize(o).toLowerCase()
						);
						const tokenLower = normalize(rawCA).toLowerCase();
						const matchIdx = lowerOptions.indexOf(tokenLower);
						if (matchIdx >= 0) {
							corrected = String(matchIdx);
						} else {
							// Last attempt: direct indexOf
							const directMatch = initialData.options.indexOf(
								initialData.correctAnswer
							);
							if (directMatch >= 0) {
								corrected = String(directMatch);
							}
						}
					}
				}
			}

			setFormData({
				id: (initialData as any).id,
				questionText: initialData.questionText,
				type: initialData.type,
				points: initialData.points,
				options: initialData.options || [],
				correctAnswer: corrected,
				imageFile: (initialData as any).imageFile || null,
				imageUrl: initialData.imageUrl || "",
				allowPhotoAnswer,
				optionImages: (initialData as any).optionImages || undefined,
			});

			// Load preview - prioritas: imageFile (local) > imageUrl (DB)
			if ((initialData as any).imageFile) {
				const reader = new FileReader();
				reader.onloadend = () => {
					setImagePreview(reader.result as string);
				};
				reader.readAsDataURL((initialData as any).imageFile);
			} else if (initialData.imageUrl) {
				// Load full image URL from DB
				import("@/lib/imageUrl").then(({ getImageUrl }) => {
					setImagePreview(getImageUrl(initialData.imageUrl || ""));
				});
			} else {
				setImagePreview("");
			}

			// Load option images from database if they exist
			// Priority: optionImagePreviews (already loaded) > optionImages (need to convert)
			if (
				(initialData as any).optionImagePreviews &&
				Array.isArray((initialData as any).optionImagePreviews)
			) {
				// Load from local previews - these are already converted from DB images
				console.log(
					"📸 Loading optionImagePreviews from initialData:",
					(initialData as any).optionImagePreviews
				);
				setOptionImagePreviews([...(initialData as any).optionImagePreviews]);
			} else if (
				(initialData as any).optionImages &&
				Array.isArray((initialData as any).optionImages)
			) {
				const optImages = (initialData as any).optionImages;
				console.log("📸 Loading optionImages from DB:", optImages);
				// Reset previews first
				const previews = ["", "", "", "", ""];
				(async () => {
					try {
						const { getImageUrl } = await import("@/lib/imageUrl");
						optImages.forEach((imageUrl: string, idx: number) => {
							if (imageUrl) {
								previews[idx] = getImageUrl(imageUrl);
								console.log(`📸 Image ${idx}:`, imageUrl, "->", previews[idx]);
							}
						});
						console.log("📸 Final previews:", previews);
						setOptionImagePreviews([...previews]);
					} catch (err) {
						console.error("📸 Failed to load images:", err);
						setOptionImagePreviews(["", "", "", "", ""]);
					}
				})();
			} else {
				// Reset if no images
				console.log("📸 No images found, resetting previews");
				setOptionImagePreviews(["", "", "", "", ""]);
			}
		} else {
			setFormData({
				id: undefined,
				questionText: "",
				type: "multiple_choice",
				points: 1,
				options: ["", "", "", ""],
				correctAnswer: "",
				imageFile: null,
				imageUrl: "",
				allowPhotoAnswer: false,
				optionImages: undefined,
			});
			setImagePreview("");
			setOptionImages([null, null, null, null, null]);
			setOptionImagePreviews(["", "", "", "", ""]);
		}
	}, [isOpen, initialData]);

	const handleSubmit = async () => {
		// Validation
		// For essay questions with photo answer, allow empty text if there's a photo
		if (
			!formData.questionText.trim() &&
			!(formData.type === "essay" && formData.allowPhotoAnswer)
		) {
			toast.error("Pertanyaan harus diisi");
			return;
		}

		if (formData.type !== "essay") {
			// Count options that have either text OR image
			const filledOptions = formData.options.filter((o, idx) => {
				const hasText = o.trim() !== "";
				const hasImage = optionImagePreviews[idx] !== "";
				return hasText || hasImage;
			});

			// Validate that each option has either text or image, not empty
			for (let i = 0; i < formData.options.length; i++) {
				const hasText = formData.options[i].trim() !== "";
				const hasImage = optionImagePreviews[i] !== "";
				// If option slot is used, it must have either text or image
				if (!hasText && !hasImage && i < filledOptions.length + 1) {
					toast.error(
						`Pilihan ${String.fromCharCode(
							65 + i
						)} tidak lengkap - tulis teks atau upload gambar`
					);
					return;
				}
			}

			if (formData.type !== "true_false" && filledOptions.length < 2) {
				toast.error("Minimal 2 pilihan harus diisi");
				return;
			}
		}

		// Validate that trailing options have either text OR image (not completely empty)
		for (let i = formData.options.length - 1; i >= 0; i--) {
			const opt = formData.options[i];
			const img = optionImagePreviews[i];
			// Only reject if: no text AND no image (completely empty)
			if (opt.trim() === "" && !img) {
				// This is okay, just a blank option
				continue;
			}
			// If we find an option with content (text or image), stop checking trailing options
			if (opt.trim() !== "" || img) {
				break;
			}
		}

		console.log(
			"🔍 handleSubmit validation - correctAnswer:",
			formData.correctAnswer,
			"trim:",
			formData.correctAnswer.trim(),
			"isEmpty:",
			!formData.correctAnswer.trim()
		);

		if (!formData.correctAnswer.trim()) {
			if (formData.type === "mixed_multiple_choice") {
				console.log("❌ MMC validation failed: no correct answers selected");
				toast.error("Pilih minimal 1 jawaban yang benar untuk soal majemuk");
			} else {
				console.log(
					"❌ Multiple choice validation failed: no correct answer selected"
				);
				toast.error("Pilih jawaban yang benar");
			}
			return;
		}

		// For mixed_multiple_choice, validate that at least one answer is selected
		if (formData.type === "mixed_multiple_choice") {
			const selected = (formData.correctAnswer || "")
				.split(",")
				.map((x) => Number(x.trim()))
				.filter((n) => !Number.isNaN(n));
			console.log(
				"🔍 MMC correctAnswer parsed:",
				formData.correctAnswer,
				"selected indices:",
				selected
			);
			if (selected.length === 0) {
				console.log("❌ MMC validation failed: selected.length === 0");
				toast.error("Pilih minimal 1 jawaban yang benar untuk soal majemuk");
				return;
			}
		}

		setSaving(true);
		try {
			// Filter options to remove trailing empty ones
			let filteredOptions = formData.options || [];

			// Remove trailing completely empty options (no text AND no image)
			// Keep photo-only options (image without text)
			while (filteredOptions.length > 0) {
				const lastIdx = filteredOptions.length - 1;
				const lastOption = filteredOptions[lastIdx];
				const lastImage = optionImagePreviews[lastIdx];

				// Keep if has text OR has image
				if (lastOption.trim() !== "" || lastImage) {
					break;
				}
				// Remove only if: empty text AND no image
				console.log(`🗑️ Trimming trailing empty option at index ${lastIdx}`);
				filteredOptions = filteredOptions.slice(0, -1);
				optionImagePreviews.pop();
				optionImages.pop();
			}

			// Adjust correctAnswer if it points to removed options
			const correctAnswerNum = parseInt(formData.correctAnswer, 10);
			if (correctAnswerNum >= filteredOptions.length) {
				console.warn(
					`⚠️ correctAnswer ${formData.correctAnswer} is out of bounds after trim, resetting`
				);
				formData.correctAnswer = ""; // Reset invalid answer
			}

			// Prepare output object with canonical correctAnswer format
			const out: any = {
				...formData,
				options: filteredOptions, // Use filtered options
				optionImageFiles: optionImages, // Include option image files for upload
				optionImagePreviews: optionImagePreviews, // Include previews for local display
				// Include existing optionImages from DB if they exist (for edit mode)
				optionImages: (formData as any).optionImages || undefined,
			};

			console.log("💾 QuestionModal handleSubmit - out object:", {
				questionText: out.questionText?.substring(0, 30),
				type: out.type,
				hasOptionImageFiles: !!out.optionImageFiles,
				optionImageFilesLength: out.optionImageFiles?.length || 0,
				optionImages: out.optionImages,
				correctAnswer: out.correctAnswer,
				correctAnswerTrimmed: out.correctAnswer?.trim(),
			});

			if (formData.type === "mixed_multiple_choice") {
				// formData.correctAnswer already stores indices like "0,2" from checkbox handling
				out.correctAnswer = String(formData.correctAnswer || "").trim();
				console.log(
					"💾 MMC correctAnswer final:",
					out.correctAnswer,
					"length:",
					out.correctAnswer?.length
				);
			} else if (formData.type === "multiple_choice") {
				// Convert selected correct option to index
				// correctAnswer can be either:
				// 1. An index (as string) - if the option was empty (only photo)
				// 2. Option text - if the option has text
				// We always need to convert to index for backend
				const optList = (formData.options || []).map((o: string) =>
					(o || "").toString()
				);
				let idx = -1;
				if (formData.correctAnswer != null) {
					const raw = String(formData.correctAnswer || "").trim();

					// Check if raw is already a numeric index
					if (/^\d+$/.test(raw)) {
						const num = Number(raw);
						if (num >= 0 && num < optList.length) {
							idx = num;
						}
					}

					// If not found as index, try text matching
					if (idx < 0) {
						// Prefer exact option-text match first (handles numeric option text like "4")
						idx = optList.findIndex((o) => (o || "").toString() === raw);
						if (idx < 0) {
							// try case-insensitive exact match
							idx = optList.findIndex(
								(o) => (o || "").toString().toLowerCase() === raw.toLowerCase()
							);
						}
					}
				}
				out.correctAnswer =
					idx >= 0 ? String(idx) : String(formData.correctAnswer || "");
			} else {
				out.correctAnswer = String(formData.correctAnswer || "");
			}

			const result = onSave(out);
			if (result instanceof Promise) await result;
			onClose();
		} catch (error) {
			// Error handled in parent
		} finally {
			setSaving(false);
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Ukuran file maksimal 5MB");
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("File harus berupa gambar");
			return;
		}

		setFormData({ ...formData, imageFile: file, imageUrl: "" });

		const reader = new FileReader();
		reader.onloadend = () => {
			setImagePreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleOptionImageChange = (
		index: number,
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Ukuran file maksimal 5MB");
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("File harus berupa gambar");
			return;
		}

		const newImages = [...optionImages];
		const newPreviews = [...optionImagePreviews];
		newImages[index] = file;

		const reader = new FileReader();
		reader.onloadend = () => {
			newPreviews[index] = reader.result as string;
			setOptionImagePreviews([...newPreviews]);
		};
		reader.readAsDataURL(file);

		setOptionImages(newImages);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header - Sticky */}
				<div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between rounded-t-lg shadow">
					<div>
						<h2 className="text-2xl font-bold">
							{isEditing ? "✏️ Edit Soal" : "➕ Tambah Soal Baru"}
						</h2>
						<p className="text-blue-100 text-sm mt-1">
							{formData.type === "essay"
								? "Soal Essay"
								: formData.type === "true_false"
								? "Soal Benar/Salah"
								: formData.type === "mixed_multiple_choice"
								? "Pilihan Ganda Majemuk"
								: "Pilihan Ganda"}
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-white hover:bg-white hover:text-blue-600 rounded-full p-2 transition"
					>
						✕
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Question Image Section */}
					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
						<label className="block text-sm font-semibold text-gray-700 mb-3">
							📷 Gambar Pertanyaan (Opsional)
						</label>
						<div className="flex items-start gap-4">
							<input
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								className="text-sm flex-1"
							/>
							{imagePreview ? (
								<div className="flex items-center gap-2">
									<img
										src={imagePreview}
										alt="Preview"
										className="w-20 h-20 object-contain border-2 border-blue-300 rounded-lg bg-white"
									/>
									<button
										type="button"
										onClick={() => {
											setFormData({
												...formData,
												imageFile: null,
												imageUrl: "",
											});
											setImagePreview("");
										}}
										className="px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded font-medium transition"
									>
										Hapus
									</button>
								</div>
							) : (
								<span className="text-xs text-gray-500 whitespace-nowrap">
									Maks 5MB
								</span>
							)}
						</div>
					</div>

					{/* Question Text */}
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							📝 Pertanyaan <span className="text-red-500">*</span>
						</label>
						<textarea
							value={formData.questionText}
							onChange={(e) =>
								setFormData({ ...formData, questionText: e.target.value })
							}
							className="input w-full border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
							rows={3}
							placeholder="Tulis pertanyaan di sini..."
						/>
					</div>

					{/* Type and Points */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								🎯 Tipe Soal <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.type}
								onChange={(e) => {
									const newType = e.target.value;
									setFormData({
										...formData,
										type: newType,
										options:
											newType === "essay"
												? []
												: newType === "true_false"
												? ["Benar", "Salah"]
												: ["", "", "", ""],
										correctAnswer: "",
										allowPhotoAnswer:
											newType === "essay" ? formData.allowPhotoAnswer : false,
									});
								}}
								className="input w-full border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
							>
								{QuestionTypes.map((type) => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								⭐ Poin <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								value={formData.points}
								onChange={(e) =>
									setFormData({ ...formData, points: parseInt(e.target.value) })
								}
								className="input w-full border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
								min="1"
								placeholder="10"
							/>
						</div>
					</div>

					{/* Allow Photo Answer - Khusus untuk Essay */}
					{formData.type === "essay" && (
						<div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
							<input
								type="checkbox"
								id="allowPhotoAnswer"
								checked={formData.allowPhotoAnswer}
								onChange={(e) =>
									setFormData({
										...formData,
										allowPhotoAnswer: e.target.checked,
									})
								}
								className="w-5 h-5 mt-0.5 cursor-pointer"
							/>
							<label
								htmlFor="allowPhotoAnswer"
								className="flex-1 cursor-pointer"
							>
								<div className="font-semibold text-sm text-blue-900">
									📸 Izinkan Jawaban Berupa Foto
								</div>
								<div className="text-xs text-blue-700 mt-1">
									Siswa dapat menjawab dengan mengunggah foto jawaban tertulis
								</div>
							</label>
						</div>
					)}

					{/* Options */}
					{formData.type !== "essay" && (
						<div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
							<label className="block text-sm font-semibold text-gray-700 mb-3">
								🔤 Pilihan Jawaban <span className="text-red-500">*</span>
							</label>

							{formData.type === "true_false" ? (
								<div className="space-y-2">
									{["Benar", "Salah"].map((option) => (
										<label
											key={option}
											className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
												formData.correctAnswer === option
													? "bg-green-100 border-green-500 shadow-md"
													: "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"
											}`}
										>
											<input
												type="radio"
												name="trueFalse"
												value={option}
												checked={formData.correctAnswer === option}
												onChange={(e) =>
													setFormData({
														...formData,
														correctAnswer: e.target.value,
													})
												}
												className="w-5 h-5 cursor-pointer"
											/>
											<span className="text-base font-semibold flex-1">
												{option === "Benar" ? "✅" : "❌"} {option}
											</span>
											{formData.correctAnswer === option && (
												<span className="ml-auto text-green-600 text-sm font-bold bg-green-200 px-3 py-1 rounded-full">
													JAWABAN BENAR
												</span>
											)}
										</label>
									))}
								</div>
							) : formData.type === "mixed_multiple_choice" ? (
								<div>
									<div className="flex items-center justify-between mb-2">
										<p className="text-xs text-gray-600">
											Pilih lebih dari satu jawaban yang benar
										</p>
										<button
											type="button"
											onClick={() => {
												if (formData.options.length < 5) {
													setFormData({
														...formData,
														options: [...formData.options, ""],
													});
												} else {
													toast.error("Maksimal 5 pilihan");
												}
											}}
											className="text-blue-600 hover:text-blue-800 text-sm font-medium"
										>
											+ Tambah Opsi
										</button>
									</div>
									<div className="space-y-2">
										{formData.options.map((option, idx) => {
											const selected = (formData.correctAnswer || "")
												.split(",")
												.map((x: string) => {
													const trimmed = x.trim();
													return trimmed ? Number(trimmed) : NaN;
												})
												.filter((n: number) => !Number.isNaN(n));
											const isChecked = selected.includes(idx);
											return (
												<div
													key={idx}
													className={`flex items-center gap-2 p-3 border rounded transition-all ${
														isChecked
															? "bg-green-50 border-green-400 ring-2 ring-green-200"
															: "bg-white border-gray-200"
													}`}
												>
													<input
														type="checkbox"
														checked={isChecked}
														onChange={(e) => {
															const updatedSelected = e.target.checked
																? [...selected, idx]
																: selected.filter((x: number) => x !== idx);
															setFormData({
																...formData,
																correctAnswer: updatedSelected
																	.sort((a: number, b: number) => a - b)
																	.join(","),
															});
														}}
														className="w-4 h-4"
													/>
													<span className="text-sm font-medium w-8">
														{String.fromCharCode(65 + idx)}.
													</span>
													<input
														type="text"
														className="input flex-1"
														placeholder={`Pilihan ${String.fromCharCode(
															65 + idx
														)}`}
														value={option}
														onChange={(e) => {
															const newValue = e.target.value;
															const newOptions = [...formData.options];
															newOptions[idx] = newValue;
															setFormData({
																...formData,
																options: newOptions,
															});
														}}
													/>
													{/* Option Image Upload */}
													{optionImagePreviews[idx] ? (
														<div
															className="flex items-center gap-1"
															onClick={(e) => e.stopPropagation()}
														>
															<img
																src={optionImagePreviews[idx]}
																alt={`Option ${String.fromCharCode(65 + idx)}`}
																className="w-8 h-8 object-contain border rounded"
															/>
															<button
																type="button"
																onClick={() => {
																	const newImages = [...optionImages];
																	const newPreviews = [...optionImagePreviews];
																	newImages[idx] = null;
																	newPreviews[idx] = "";
																	setOptionImages(newImages);
																	setOptionImagePreviews(newPreviews);
																}}
																className="text-red-600 text-xs"
															>
																✕
															</button>
														</div>
													) : (
														<label
															className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded cursor-pointer transition text-sm font-medium text-gray-700"
															onClick={(e) => e.stopPropagation()}
														>
															📷 Gambar
															<input
																type="file"
																accept="image/*"
																onChange={(e) =>
																	handleOptionImageChange(idx, e)
																}
																className="hidden"
															/>
														</label>
													)}
													{isChecked && (
														<span className="text-green-600 text-sm font-bold whitespace-nowrap">
															✓ Benar
														</span>
													)}
													{idx > 3 && (
														<button
															type="button"
															onClick={() => {
																const newOptions = formData.options.filter(
																	(_, i) => i !== idx
																);
																const newSelected = selected
																	.filter((x) => x !== idx)
																	.map((x) => (x > idx ? x - 1 : x));
																setFormData({
																	...formData,
																	options: newOptions,
																	correctAnswer: newSelected.join(","),
																});
															}}
															className="text-red-600 hover:text-red-800"
														>
															✕
														</button>
													)}
												</div>
											);
										})}
									</div>
								</div>
							) : (
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-gray-600">
											Klik pilihan untuk menandai jawaban benar
										</span>
										<button
											type="button"
											onClick={() => {
												if (formData.options.length < 5) {
													setFormData({
														...formData,
														options: [...formData.options, ""],
													});
												} else {
													toast.error("Maksimal 5 pilihan");
												}
											}}
											className="text-blue-600 hover:text-blue-800 text-sm font-medium"
										>
											+ Tambah Opsi
										</button>
									</div>
									<div className="space-y-2">
										{formData.options.map((option, idx) => {
											// Always use index for consistency
											// This avoids confusion with empty options vs text that matches numbers
											let isCorrect = false;
											try {
												const selectedIdx = parseInt(
													formData.correctAnswer,
													10
												);
												isCorrect = !isNaN(selectedIdx) && selectedIdx === idx;
											} catch (e) {
												isCorrect = false;
											}

											return (
												<label
													key={idx}
													className={`flex items-center gap-2 p-3 border rounded cursor-pointer transition-all ${
														isCorrect
															? "bg-green-50 border-green-400 ring-2 ring-green-200"
															: "bg-white border-gray-200 hover:border-gray-400"
													}`}
												>
													<input
														type="radio"
														name="correctAnswer"
														checked={isCorrect}
														onChange={() =>
															setFormData({
																...formData,
																// Always store index for consistency
																correctAnswer: String(idx),
															})
														}
														className="w-4 h-4"
													/>
													<span className="text-sm font-medium w-8">
														{String.fromCharCode(65 + idx)}.
													</span>
													<input
														type="text"
														className="input flex-1"
														placeholder={`Pilihan ${String.fromCharCode(
															65 + idx
														)}`}
														value={option}
														onChange={(e) => {
															const newValue = e.target.value;
															const newOptions = [...formData.options];
															const wasCorrect =
																option.trim() === ""
																	? formData.correctAnswer === String(idx)
																	: formData.correctAnswer ===
																	  formData.options[idx];
															newOptions[idx] = newValue;
															setFormData({
																...formData,
																options: newOptions,
																correctAnswer: wasCorrect
																	? newValue || String(idx)
																	: formData.correctAnswer,
															});
														}}
													/>

													{/* Option Image Upload */}
													{optionImagePreviews[idx] ? (
														<div
															className="flex items-center gap-1"
															onClick={(e) => e.stopPropagation()}
														>
															<img
																src={optionImagePreviews[idx]}
																alt={`Option ${String.fromCharCode(65 + idx)}`}
																className="w-8 h-8 object-contain border rounded"
															/>
															<button
																type="button"
																onClick={() => {
																	const newImages = [...optionImages];
																	const newPreviews = [...optionImagePreviews];
																	newImages[idx] = null;
																	newPreviews[idx] = "";
																	setOptionImages(newImages);
																	setOptionImagePreviews(newPreviews);
																}}
																className="text-red-600 text-xs"
															>
																✕
															</button>
														</div>
													) : (
														<label
															className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded cursor-pointer transition text-sm font-medium text-gray-700"
															onClick={(e) => e.stopPropagation()}
														>
															📷 Gambar
															<input
																type="file"
																accept="image/*"
																onChange={(e) =>
																	handleOptionImageChange(idx, e)
																}
																className="hidden"
															/>
														</label>
													)}

													{isCorrect && (
														<span className="text-green-600 text-sm font-bold whitespace-nowrap">
															✓ Jawaban Benar
														</span>
													)}
													{idx > 3 && (
														<button
															type="button"
															onClick={(e) => {
																e.preventDefault();
																setFormData({
																	...formData,
																	options: formData.options.filter(
																		(_, i) => i !== idx
																	),
																});
															}}
															className="text-red-600 hover:text-red-800"
														>
															✕
														</button>
													)}
												</label>
											);
										})}
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="btn btn-outline"
						disabled={saving}
					>
						Batal
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						className="btn btn-primary"
						disabled={saving}
					>
						{saving
							? "Menyimpan..."
							: isEditing
							? "Perbarui Soal"
							: "Tambah Soal"}
					</button>
				</div>
			</div>
		</div>
	);
}
