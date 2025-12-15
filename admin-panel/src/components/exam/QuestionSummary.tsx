import { Question } from "@/types/exam";

interface QuestionSummaryProps {
	questions: Question[];
	onAddQuestion: () => void;
	onImport?: () => void;
	onDownloadTemplate?: () => void;
	importing?: boolean;
}

export default function QuestionSummary({
	questions,
	onAddQuestion,
	onImport,
	onDownloadTemplate,
	importing = false,
}: QuestionSummaryProps) {
	return (
		<div className="card sticky top-24">
			<h3 className="text-lg font-bold mb-4">Ringkasan Soal</h3>
			<div className="space-y-3 text-sm">
				<div className="flex justify-between items-center py-2 border-b">
					<span className="text-gray-600">Total Soal:</span>
					<span className="font-bold text-lg">{questions.length}</span>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-gray-600">
						<span>Pilihan Ganda:</span>
						<span className="font-medium">
							{questions.filter((q) => q.type === "multiple_choice").length}
						</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Pilihan Ganda Majemuk:</span>
						<span className="font-medium">
							{
								questions.filter((q) => q.type === "mixed_multiple_choice")
									.length
							}
						</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Benar/Salah:</span>
						<span className="font-medium">
							{questions.filter((q) => q.type === "true_false").length}
						</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Essay:</span>
						<span className="font-medium">
							{questions.filter((q) => q.type === "essay").length}
						</span>
					</div>
				</div>

				<div className="mt-6 pt-4 border-t">
					<button
						type="button"
						onClick={onAddQuestion}
						className="btn btn-primary w-full"
					>
						+ Tambah Soal
					</button>
				</div>

				{onImport && onDownloadTemplate && (
					<div className="mt-4 space-y-2">
						<button
							type="button"
							onClick={onImport}
							className="btn btn-secondary w-full text-sm"
							disabled={importing}
						>
							{importing ? "Mengimpor..." : "Import Soal"}
						</button>
						<button
							type="button"
							onClick={onDownloadTemplate}
							className="btn btn-outline w-full text-sm"
						>
							Template
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
