import { Class, Semester, Subject, Grade } from "@/types/exam";

interface ExamFormProps {
	formData: {
		title: string;
		description: string;
		duration: number;
		startTime: string;
		endTime: string;
		semesterId: string;
		targetType: "class" | "grade";
		classId: string;
		gradeId: string;
		subjectId: string;
		randomizeQuestions: boolean;
		showResultImmediately: boolean;
	};
	setFormData: (data: any) => void;
	semesters: Semester[];
	classes: Class[];
	subjects: Subject[];
	grades: Grade[];
	examImageFile: File | null;
	examImagePreview: string;
	onExamImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ExamForm({
	formData,
	setFormData,
	semesters,
	classes,
	subjects,
	grades,
	examImageFile,
	examImagePreview,
	onExamImageChange,
}: ExamFormProps) {
	return (
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
						Gambar Ujian (opsional)
					</label>
					<input
						type="file"
						accept="image/*"
						onChange={onExamImageChange}
						className="input"
					/>
					{examImageFile && (
						<p className="text-sm text-green-600 mt-1">
							✓ File: {examImageFile.name}
						</p>
					)}
					{examImagePreview && (
						<img
							src={examImagePreview}
							alt="Preview"
							className="h-32 rounded object-cover mt-2"
						/>
					)}
				</div>

				<div className="col-span-2">
					<label className="block text-sm font-medium mb-2">Deskripsi *</label>
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
					<label className="block text-sm font-medium mb-2">Semester *</label>
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
							<option key={sem.id} value={sem.id.toString()}>
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
								gradeId: "",
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
						<label className="block text-sm font-medium mb-2">Kelas *</label>
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
								<option key={cls.id} value={cls.id.toString()}>
									{cls.name} - {cls.major}
								</option>
							))}
						</select>
					</div>
				) : (
					<div>
						<label className="block text-sm font-medium mb-2">Angkatan *</label>
						<select
							value={formData.gradeId}
							onChange={(e) =>
								setFormData({ ...formData, gradeId: e.target.value })
							}
							className="input"
							required
						>
							<option value="">Pilih Angkatan</option>
							{grades
								.filter((g) => g.isActive)
								.map((grade) => (
									<option key={grade.id} value={grade.id.toString()}>
										{grade.name} ({grade.section})
									</option>
								))}
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
							<option key={subj.id} value={subj.id.toString()}>
								{subj.name}
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
						<span className="text-sm">Acak urutan soal</span>
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
							Tampilkan hasil segera setelah selesai
						</span>
					</label>
				</div>
			</div>
		</div>
	);
}
