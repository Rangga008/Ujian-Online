/**
 * DTO untuk membuat/update soal dengan opsi foto
 * Setiap field di-define dengan jelas agar tidak ada kebingungan
 */
export class CreateQuestionWithImagesDto {
	// ID - optional untuk membedakan update vs create
	id?: number;

	// Teks pertanyaan
	questionText: string;

	// Tipe soal: 'multiple_choice' | 'true_false' | 'essay'
	type: "multiple_choice" | "true_false" | "essay";

	// Opsi teks (array of strings)
	options?: string[];

	// Foto untuk setiap opsi (array of URLs dari /uploads/)
	optionImages?: string[];

	// Jawaban yang benar (string atau number)
	correctAnswer?: string | number;

	// Poin untuk soal
	points: number;

	// Foto pertanyaan (optional)
	imageUrl?: string;

	// Urutan soal
	orderIndex: number;

	// ID ujian (akan di-set oleh service)
	examId?: number;
}
