import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import semestersApi, { Semester } from "@/lib/semestersApi";
import classesApi, { Class } from "@/lib/classesApi";

interface Subject {
	id: number;
	name: string;
	code: string;
}

interface Question {
	questionText: string;
	type: "multiple_choice" | "mixed_multiple_choice" | "true_false";
	options: string[];
	correctAnswer: string;
	points: number;
	orderIndex: number;
}

export default function CreateExamPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
	const [semesters, setSemesters] = useState<Semester[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		duration: 60,
		startTime: "",
		endTime: "",
		semesterId: "",
		targetType: "class" as "class" | "grade",
		classId: "",
		grade: "",
		subjectId: "",
		totalScore: 100,
		randomizeQuestions: true,
		showResultImmediately: false,
		status: "draft",
	});

	useEffect(() => {
		fetchInitialData();
	}, []);

	useEffect(() => {
		if (formData.semesterId) {
			fetchClassesBySemester(Number(formData.semesterId));
		}
	}, [formData.semesterId]);

	const fetchInitialData = async () => {
		try {
			const [active, allSemesters, subjectsData] = await Promise.all([
				semestersApi.getActive().catch(() => null),
				semestersApi.getAll(),
				api.get("/subjects").then((res) => res.data),
			]);
			setActiveSemester(active);
			setSemesters(allSemesters);
			setSubjects(subjectsData);

			if (active) {
				setFormData((prev) => ({
					...prev,
					semesterId: active.id.toString(),
				}));
			}
		} catch (error) {
			toast.error("Gagal memuat data");
		}
	};

	const fetchClassesBySemester = async (semesterId: number) => {
		try {
			const allClasses = await classesApi.getAll();
			const filtered = allClasses.filter((c) => c.semesterId === semesterId);
			setClasses(filtered);
		} catch (error) {
			toast.error("Gagal memuat kelas");
		}
	};

	const addQuestion = () => {
		const newQuestion: Question = {
			questionText: "",
			type: "multiple_choice",
			options: ["", "", "", ""],
			correctAnswer: "",
			points: 10,
			orderIndex: questions.length,
		};
		setQuestions([...questions, newQuestion]);
	};

	const removeQuestion = (index: number) => {
		const updated = questions.filter((_, i) => i !== index);
		setQuestions(updated.map((q, i) => ({ ...q, orderIndex: i })));
	};

	const updateQuestion = (index: number, field: keyof Question, value: any) => {
		const updated = [...questions];
		updated[index] = { ...updated[index], [field]: value };
		setQuestions(updated);
	};

	const updateQuestionOption = (
		questionIndex: number,
		optionIndex: number,
		value: string
	) => {
		const updated = [...questions];
		updated[questionIndex].options[optionIndex] = value;
		setQuestions(updated);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.semesterId) {
			toast.error("Pilih semester terlebih dahulu");
			return;
		}

		if (formData.targetType === "class" && !formData.classId) {
			toast.error("Pilih kelas terlebih dahulu");
			return;
		}

		if (formData.targetType === "grade" && !formData.grade) {
			toast.error("Pilih tingkat terlebih dahulu");
			return;
		}

		if (questions.length === 0) {
			toast.error("Tambahkan minimal 1 soal");
			return;
		}

		// Validate all questions
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			if (!q.questionText.trim()) {
				toast.error(`Soal ${i + 1}: Pertanyaan harus diisi`);
				return;
			}
			if (!q.correctAnswer.trim()) {
				toast.error(`Soal ${i + 1}: Jawaban benar harus diisi`);
				return;
			}
			if (
				(q.type === "multiple_choice" || q.type === "mixed_multiple_choice") &&
				q.options.some((opt) => !opt.trim())
			) {
				toast.error(`Soal ${i + 1}: Semua pilihan harus diisi`);
				return;
			}
		}

		setLoading(true);
		try {
			const totalScore = questions.reduce((sum, q) => sum + q.points, 0);
			const payload: any = {
				title: formData.title,
				description: formData.description,
				duration: formData.duration,
				startTime: formData.startTime,
				endTime: formData.endTime,
				semesterId: Number(formData.semesterId),
				targetType: formData.targetType,
				subjectId: formData.subjectId ? Number(formData.subjectId) : undefined,
				totalScore,
				totalQuestions: questions.length,
				randomizeQuestions: formData.randomizeQuestions,
				showResultImmediately: formData.showResultImmediately,
				status: formData.status,
				questions: questions.map((q) => ({
					questionText: q.questionText,
					type: q.type,
					options: q.type === "true_false" ? ["True", "False"] : q.options,
					correctAnswer: q.correctAnswer,
					points: q.points,
					orderIndex: q.orderIndex,
				})),
			};

			if (formData.targetType === "class") {
				payload.classId = Number(formData.classId);
			} else {
				payload.grade = formData.grade;
			}

			await api.post("/exams", payload);
			toast.success("Ujian berhasil dibuat");
			router.push("/exams");
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Gagal membuat ujian");
		} finally {
			setLoading(false);
		}
	};

	const getQuestionTypeLabel = (type: Question["type"]) => {
		switch (type) {
			case "multiple_choice":
				return "Pilihan Ganda";
			case "mixed_multiple_choice":
				return "Pilihan Ganda Campuran";
			case "true_false":
				return "True/False";
			default:
				return type;
		}
	};

	return (
		<Layout>
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900">Buat Ujian Baru</h1>
					<p className="text-gray-600 mt-2">
						Isi informasi ujian dan tambahkan soal-soal
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Info */}
					<div className="card">
						<h2 className="text-xl font-bold mb-4">Informasi Ujian</h2>
						<div className="grid grid-cols-2 gap-4">
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-2">
									Judul Ujian *
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									className="input"
									required
								/>
							</div>

							<div className="col-span-2">
								<label className="block text-sm font-medium mb-2">
									Deskripsi *
								</label>
								<textarea
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									className="input"
									rows={3}
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Semester *
								</label>
								<select
									value={formData.semesterId}
									onChange={(e) =>
										setFormData({ ...formData, semesterId: e.target.value })
									}
									className="input"
									required
								>
									<option value="">Pilih Semester</option>
									{semesters.map((sem) => (
										<option key={sem.id} value={sem.id}>
											{sem.name} - {sem.year}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Target Ujian *
								</label>
								<select
									value={formData.targetType}
									onChange={(e) => {
										const targetType = e.target.value as "class" | "grade";
										setFormData({
											...formData,
											targetType,
											classId: "",
											grade: "",
										});
									}}
									className="input"
									required
								>
									<option value="class">Satu Kelas</option>
									<option value="grade">Satu Angkatan</option>
								</select>
							</div>

							{formData.targetType === "class" ? (
								<div>
									<label className="block text-sm font-medium mb-2">
										Kelas *
									</label>
									<select
										value={formData.classId}
										onChange={(e) =>
											setFormData({ ...formData, classId: e.target.value })
										}
										className="input"
										required
										disabled={!formData.semesterId}
									>
										<option value="">Pilih Kelas</option>
										{classes.map((cls) => (
											<option key={cls.id} value={cls.id}>
												{cls.name} - {cls.major}
											</option>
										))}
									</select>
								</div>
							) : (
								<div>
									<label className="block text-sm font-medium mb-2">
										Tingkat *
									</label>
									<select
										value={formData.grade}
										onChange={(e) =>
											setFormData({ ...formData, grade: e.target.value })
										}
										className="input"
										required
									>
										<option value="">Pilih Tingkat</option>
										<option value="10">Kelas 10</option>
										<option value="11">Kelas 11</option>
										<option value="12">Kelas 12</option>
									</select>
								</div>
							)}

							<div>
								<label className="block text-sm font-medium mb-2">
									Mata Pelajaran
								</label>
								<select
									value={formData.subjectId}
									onChange={(e) =>
										setFormData({ ...formData, subjectId: e.target.value })
									}
									className="input"
								>
									<option value="">Pilih Mata Pelajaran</option>
									{subjects.map((subj) => (
										<option key={subj.id} value={subj.id}>
											{subj.name} ({subj.code})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Durasi (menit) *
								</label>
								<input
									type="number"
									value={formData.duration}
									onChange={(e) =>
										setFormData({
											...formData,
											duration: Number(e.target.value),
										})
									}
									className="input"
									min={1}
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">
									Waktu Mulai *
								</label>
								<input
									type="datetime-local"
									value={formData.startTime}
									onChange={(e) =>
										setFormData({ ...formData, startTime: e.target.value })
									}
									className="input"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Waktu Selesai *
								</label>
								<input
									type="datetime-local"
									value={formData.endTime}
									onChange={(e) =>
										setFormData({ ...formData, endTime: e.target.value })
									}
									className="input"
									required
								/>
							</div>

							<div className="col-span-2">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={formData.randomizeQuestions}
										onChange={(e) =>
											setFormData({
												...formData,
												randomizeQuestions: e.target.checked,
											})
										}
										className="rounded"
									/>
									<span className="text-sm">Acak Urutan Soal</span>
								</label>
							</div>

							<div className="col-span-2">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={formData.showResultImmediately}
										onChange={(e) =>
											setFormData({
												...formData,
												showResultImmediately: e.target.checked,
											})
										}
										className="rounded"
									/>
									<span className="text-sm">
										Tampilkan Hasil Segera Setelah Selesai
									</span>
								</label>
							</div>
						</div>
					</div>

					{/* Questions */}
					<div className="card">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold">Soal Ujian</h2>
							<button
								type="button"
								onClick={addQuestion}
								className="btn btn-primary"
							>
								+ Tambah Soal
							</button>
						</div>

						{questions.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								Belum ada soal. Klik "Tambah Soal" untuk memulai.
							</div>
						) : (
							<div className="space-y-6">
								{questions.map((question, qIndex) => (
									<div
										key={qIndex}
										className="border rounded-lg p-4 bg-gray-50 relative"
									>
										<button
											type="button"
											onClick={() => removeQuestion(qIndex)}
											className="absolute top-4 right-4 text-red-600 hover:text-red-700"
										>
											❌ Hapus
										</button>

										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium mb-2">
													Soal #{qIndex + 1}
												</label>
												<textarea
													value={question.questionText}
													onChange={(e) =>
														updateQuestion(
															qIndex,
															"questionText",
															e.target.value
														)
													}
													className="input"
													rows={3}
													placeholder="Tulis pertanyaan di sini..."
													required
												/>
											</div>

											<div className="grid grid-cols-2 gap-4">
												<div>
													<label className="block text-sm font-medium mb-2">
														Tipe Soal
													</label>
													<select
														value={question.type}
														onChange={(e) =>
															updateQuestion(qIndex, "type", e.target.value)
														}
														className="input"
													>
														<option value="multiple_choice">
															Pilihan Ganda
														</option>
														<option value="mixed_multiple_choice">
															Pilihan Ganda Campuran
														</option>
														<option value="true_false">True/False</option>
													</select>
												</div>

												<div>
													<label className="block text-sm font-medium mb-2">
														Poin
													</label>
													<input
														type="number"
														value={question.points}
														onChange={(e) =>
															updateQuestion(
																qIndex,
																"points",
																Number(e.target.value)
															)
														}
														className="input"
														min={1}
													/>
												</div>
											</div>

											{question.type === "true_false" ? (
												<div>
													<label className="block text-sm font-medium mb-2">
														Jawaban Benar
													</label>
													<select
														value={question.correctAnswer}
														onChange={(e) =>
															updateQuestion(
																qIndex,
																"correctAnswer",
																e.target.value
															)
														}
														className="input"
													>
														<option value="">Pilih Jawaban</option>
														<option value="True">True</option>
														<option value="False">False</option>
													</select>
												</div>
											) : (
												<div>
													<label className="block text-sm font-medium mb-2">
														Pilihan Jawaban
													</label>
													<div className="space-y-2">
														{question.options.map((option, oIndex) => (
															<div
																key={oIndex}
																className="flex gap-2 items-center"
															>
																<span className="text-sm font-medium w-8">
																	{String.fromCharCode(65 + oIndex)}.
																</span>
																<input
																	type="text"
																	value={option}
																	onChange={(e) =>
																		updateQuestionOption(
																			qIndex,
																			oIndex,
																			e.target.value
																		)
																	}
																	className="input flex-1"
																	placeholder={`Pilihan ${String.fromCharCode(
																		65 + oIndex
																	)}`}
																/>
																<label className="flex items-center gap-1">
																	<input
																		type="radio"
																		name={`correct-${qIndex}`}
																		checked={
																			question.correctAnswer ===
																			String.fromCharCode(65 + oIndex)
																		}
																		onChange={() =>
																			updateQuestion(
																				qIndex,
																				"correctAnswer",
																				String.fromCharCode(65 + oIndex)
																			)
																		}
																	/>
																	<span className="text-sm">Benar</span>
																</label>
															</div>
														))}
													</div>
													{question.type === "mixed_multiple_choice" && (
														<p className="text-xs text-gray-500 mt-2">
															💡 Pilihan Ganda Campuran: Bisa lebih dari 1
															jawaban benar. Pisahkan dengan koma (contoh: A,C)
														</p>
													)}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						)}

						{questions.length > 0 && (
							<div className="mt-4 p-4 bg-blue-50 rounded-lg">
								<div className="flex items-center justify-between text-sm">
									<span>Total Soal: {questions.length}</span>
									<span>
										Total Poin:{" "}
										{questions.reduce((sum, q) => sum + q.points, 0)}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Submit */}
					<div className="flex gap-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="btn btn-secondary"
							disabled={loading}
						>
							Batal
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={loading}
						>
							{loading ? "Menyimpan..." : "Simpan Ujian"}
						</button>
					</div>
				</form>
			</div>
		</Layout>
	);
}
