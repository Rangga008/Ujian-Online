import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface QuestionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (questionData: any) => Promise<void>;
	initialData?: {
		questionText: string;
		type: string;
		points: number;
		options: string[];
		correctAnswer: string;
		imageUrl?: string;
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
		questionText: "",
		type: "multiple_choice",
		points: 1,
		options: ["", "", "", ""],
		correctAnswer: "",
		imageFile: null as File | null,
		imageUrl: "",
	});
	const [saving, setSaving] = useState(false);
	const [imagePreview, setImagePreview] = useState<string>("");

	useEffect(() => {
		if (!isOpen) return;

		if (initialData) {
			// Normalize correctAnswer for mixed_multiple_choice: backend may store option texts
			let corrected = initialData.correctAnswer || "";
			if (initialData.type === "mixed_multiple_choice" && initialData.options) {
				// Split primarily on commas/semicolons/pipes/slashes to preserve option texts with spaces
				let parts = (initialData.correctAnswer || "")
					.split(/[;,|\/]+/)
					.map((p: string) => p.trim())
					.filter(Boolean);
				// If no separators found but the string looks like letters separated by spaces (e.g. "C A"), split on whitespace
				if (parts.length === 0) {
					const raw = (initialData.correctAnswer || "").trim();
					if (/^[A-Za-z](?:\s+[A-Za-z])+$/.test(raw)) {
						parts = raw
							.split(/\s+/)
							.map((p: string) => p.trim())
							.filter(Boolean);
					} else if (raw) {
						// treat entire string as one token (option text may contain spaces)
						parts = [raw];
					}
				}

				// If parts are not numeric, try to map option text back to indices
				if (parts.length > 0 && !parts.every((p) => /^\d+$/.test(p))) {
					const normalize = (s: string) =>
						(s || "").toString().replace(/\s+/g, " ").trim();
					const lowerOptions = (initialData.options || []).map((o: string) =>
						normalize(o).toLowerCase()
					);
					const indices = parts
						.map((text) => {
							const t = normalize(text).toLowerCase();
							return lowerOptions.indexOf(t);
						})
						.filter((i: number) => i >= 0);
					corrected = indices.join(",");
				}
			}

			setFormData({
				questionText: initialData.questionText,
				type: initialData.type,
				points: initialData.points,
				options: initialData.options || [],
				correctAnswer: corrected,
				imageFile: (initialData as any).imageFile || null,
				imageUrl: initialData.imageUrl || "",
			});

			// Load preview - prioritas: imageFile (local) > imageUrl (DB)
			if ((initialData as any).imageFile) {
				// If imageFile exists, create object URL for preview
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
		} else {
			setFormData({
				questionText: "",
				type: "multiple_choice",
				points: 1,
				options: ["", "", "", ""],
				correctAnswer: "",
				imageFile: null,
				imageUrl: "",
			});
			setImagePreview("");
		}
	}, [isOpen, initialData]);

	const handleSubmit = async () => {
		// Validation
		if (!formData.questionText.trim()) {
			toast.error("Pertanyaan harus diisi");
			return;
		}

		if (formData.type !== "essay") {
			const filledOptions = formData.options.filter((o) => o.trim());
			if (formData.type !== "true_false" && filledOptions.length < 2) {
				toast.error("Minimal 2 pilihan harus diisi");
				return;
			}

			if (!formData.correctAnswer.trim()) {
				toast.error("Pilih jawaban yang benar");
				return;
			}
		}

		setSaving(true);
		try {
			const result = onSave(formData);
			// Handle both Promise and sync returns
			if (result instanceof Promise) {
				await result;
			}
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

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<h2 className="text-xl font-bold">
						{isEditing ? "Edit Soal" : "Tambah Soal Baru"}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl"
					>
						×
					</button>
				</div>

				<div className="p-6 space-y-4">
					{/* Image Upload */}
					<div className="space-y-2">
						<label className="block text-sm font-medium">
							Gambar (opsional)
						</label>
						<div className="flex items-start gap-3">
							<input
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								className="text-sm"
							/>
							{imagePreview ? (
								<div className="flex items-start gap-2">
									<img
										src={imagePreview}
										alt="Preview"
										className="w-20 h-20 object-contain border rounded"
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
										className="text-red-600 text-sm"
									>
										Hapus
									</button>
								</div>
							) : (
								<span className="text-xs text-gray-500">
									Format: gambar, maks 5MB
								</span>
							)}
						</div>
					</div>

					{/* Question Text */}
					<div>
						<label className="block text-sm font-medium mb-2">
							Pertanyaan *
						</label>
						<textarea
							value={formData.questionText}
							onChange={(e) =>
								setFormData({ ...formData, questionText: e.target.value })
							}
							className="input w-full"
							rows={3}
							placeholder="Tulis pertanyaan di sini..."
						/>
					</div>

					{/* Type and Points */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-2">
								Tipe Soal *
							</label>
							<select
								value={formData.type}
								onChange={(e) =>
									setFormData({
										...formData,
										type: e.target.value,
										options:
											e.target.value === "essay"
												? []
												: e.target.value === "true_false"
												? ["Benar", "Salah"]
												: ["", "", "", ""],
										correctAnswer: "",
									})
								}
								className="input w-full"
							>
								{QuestionTypes.map((type) => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">Poin *</label>
							<input
								type="number"
								value={formData.points}
								onChange={(e) =>
									setFormData({ ...formData, points: parseInt(e.target.value) })
								}
								className="input w-full"
								min="1"
							/>
						</div>
					</div>

					{/* Options */}
					{formData.type !== "essay" && (
						<div>
							<label className="block text-sm font-medium mb-2">
								Pilihan Jawaban *
							</label>

							{formData.type === "true_false" ? (
								<div className="space-y-2">
									{["Benar", "Salah"].map((option) => (
										<label
											key={option}
											className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
												formData.correctAnswer === option
													? "bg-green-50 border-green-400 ring-2 ring-green-200"
													: "bg-white border-gray-300 hover:border-gray-400"
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
												className="w-4 h-4"
											/>
											<span className="font-medium">{option}</span>
											{formData.correctAnswer === option && (
												<span className="ml-auto text-green-600 text-sm font-bold">
													✓ Jawaban Benar
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
												.map((x) => Number(x.trim()))
												.filter((n) => !Number.isNaN(n));
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
																: selected.filter((x) => x !== idx);
															setFormData({
																...formData,
																correctAnswer: updatedSelected
																	.sort((a, b) => a - b)
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
											const isCorrect =
												formData.correctAnswer === option &&
												option.trim() !== "" &&
												formData.correctAnswer.trim() !== "";
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
																correctAnswer: option,
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
																formData.correctAnswer ===
																formData.options[idx];
															newOptions[idx] = newValue;
															setFormData({
																...formData,
																options: newOptions,
																correctAnswer: wasCorrect
																	? newValue
																	: formData.correctAnswer,
															});
														}}
													/>
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
