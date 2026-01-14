import { Question } from "@/types/exam";
import { getImageUrl } from "@/lib/imageUrl";
import { useState, useEffect } from "react";

interface QuestionListProps {
	questions: Question[];
	onEdit: (index: number) => void;
	onDelete: (index: number) => void;
}

export default function QuestionList({
	questions,
	onEdit,
	onDelete,
}: QuestionListProps) {
	// Debug: log questions with their IDs
	useEffect(() => {
		console.log(
			"📋 QuestionList rendered with questions:",
			questions.map((q: any, idx) => ({
				idx,
				id: q.id,
				type: q.type,
				text: q.questionText?.substring(0, 30),
				correctAnswer: q.correctAnswer,
			}))
		);
	}, [questions]);

	if (questions.length === 0) {
		return (
			<div className="card">
				<div className="text-center py-8 text-gray-500">
					Belum ada soal. Klik "Tambah Soal" untuk memulai.
				</div>
			</div>
		);
	}

	const getQuestionImageSrc = (question: Question) => {
		// If there's a local file, use FileReader preview
		if (question.imageFile) {
			// Convert File to Data URL for preview
			// Note: This is a quick workaround; for production use FileReader with state
			return URL.createObjectURL(question.imageFile);
		}
		// Otherwise use imageUrl from database
		if (question.imageUrl) {
			return getImageUrl(question.imageUrl);
		}
		return null;
	};

	const getQuestionTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			multiple_choice: "Pilihan Ganda",
			mixed_multiple_choice: "Pilihan Ganda Majemuk",
			true_false: "Benar/Salah",
			essay: "Essay",
		};
		return labels[type] || type;
	};

	return (
		<div className="card">
			<h2 className="text-xl font-bold mb-4">Daftar Soal</h2>
			<div className="space-y-4">
				{questions.map((question, idx) => (
					<div key={idx} className="border rounded-lg p-4">
						<div className="flex justify-between items-start mb-2">
							<div className="flex-1">
								<p className="font-medium">
									{idx + 1}. {question.questionText}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									Tipe: {getQuestionTypeLabel(question.type)} | Poin:{" "}
									{question.points}
									{(question as any).allowPhotoAnswer && (
										<span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium inline-block">
											📷 Foto Jawaban
										</span>
									)}
								</p>
							</div>
							<div className="flex gap-2 ml-4">
								<button
									type="button"
									onClick={() => onEdit(idx)}
									className="text-blue-600 hover:text-blue-800 text-sm font-medium"
								>
									Detail
								</button>
								<button
									type="button"
									onClick={() => onEdit(idx)}
									className="text-green-600 hover:text-green-800 text-sm font-medium"
								>
									Edit
								</button>
								<button
									type="button"
									onClick={() => {
										if (confirm("Hapus soal ini?")) {
											onDelete(idx);
										}
									}}
									className="text-red-600 hover:text-red-800 text-sm font-medium"
								>
									Hapus
								</button>
							</div>
						</div>

						{question.imageUrl || question.imageFile ? (
							<div className="mt-2">
								<img
									src={getQuestionImageSrc(question) || ""}
									alt="Gambar soal"
									className="max-w-xs max-h-48 object-contain rounded border"
								/>
							</div>
						) : null}

						{/* Display Options and Correct Answer */}
						{question.type !== "essay" && question.options && (
							<div className="mt-3 space-y-1">
								{question.options.map((option: string, optIdx: number) => {
									let isCorrect = false;
									const normalize = (s: any) => (s || "").toString().trim();

									if (question.type === "true_false") {
										// For true/false: options are "BENAR" or "SALAH"
										const caRaw = normalize(
											question.correctAnswer
										).toUpperCase();
										const optRaw = normalize(option).toUpperCase();
										isCorrect = caRaw === optRaw;
									} else if (question.type === "mixed_multiple_choice") {
										const caRaw = normalize(question.correctAnswer);
										if (!caRaw) {
											isCorrect = false;
										} else {
											// Prefer splitting on commas/semicolons/pipes/slashes to keep option texts intact
											let parts = caRaw
												.split(/[;,|\/]+/)
												.map((p: string) => p.trim())
												.filter(Boolean);

											// If no separators found but looks like letter tokens separated by spaces ("C A"), split by whitespace
											if (parts.length === 0) {
												const raw = caRaw.trim();
												if (/^[A-Za-z](?:\s+[A-Za-z])+$/.test(raw)) {
													parts = raw
														.split(/\s+/)
														.map((p: string) => p.trim())
														.filter(Boolean);
												} else if (raw) {
													parts = [raw];
												}
											}

											if (
												parts.length > 0 &&
												parts.every((p: string) => /^\d+$/.test(p))
											) {
												const idxs = parts.map((p: string) => Number(p));
												isCorrect = idxs.includes(optIdx);
											} else if (
												parts.length > 0 &&
												parts.every((p: string) => /^[A-Za-z]$/.test(p))
											) {
												const idxs = parts.map(
													(p: string) => p.toUpperCase().charCodeAt(0) - 65
												);
												isCorrect = idxs.includes(optIdx);
											} else {
												const optText = normalize(option);
												const normalizeText = (s: string) =>
													(s || "")
														.toString()
														.replace(/\s+/g, " ")
														.trim()
														.toLowerCase();
												isCorrect = parts.some((p: string) => {
													const pp = p.replace(/^\s*[A-Za-z]\.\s*/, "").trim();
													return normalizeText(pp) === normalizeText(optText);
												});
											}
										}
									} else {
										// Handle several formats for correctAnswer:
										// - numeric index ("0", "2") -> index into options
										// - single letter ("A") -> map to index
										// - option text -> compare text
										const caRaw = normalize(question.correctAnswer);
										if (/^\d+$/.test(caRaw)) {
											isCorrect = Number(caRaw) === optIdx;
										} else if (/^[A-Za-z]$/.test(caRaw)) {
											isCorrect =
												caRaw.toUpperCase().charCodeAt(0) - 65 === optIdx;
										} else {
											isCorrect =
												normalize(question.correctAnswer) === normalize(option);
										}
									}

									// Debug per-option correctness to help diagnose missing highlight
									if (process.env.NODE_ENV !== "production") {
										const caRaw = normalize(question.correctAnswer);
										console.log(`🔍 Q${idx} opt${optIdx}:`, {
											questionType: question.type,
											correctAnswerRaw: question.correctAnswer,
											caRaw,
											option,
											optIdx,
											isCorrect,
										});
									}

									// Format display label based on type
									let displayLabel: string;
									if (question.type === "true_false") {
										displayLabel = `${String.fromCharCode(
											65 + optIdx
										)}. ${option}`;
									} else {
										// For multiple choice - only show text if it exists (images show without label)
										const displayText = option.trim() === "" ? "" : option;
										displayLabel = `${String.fromCharCode(
											65 + optIdx
										)}. ${displayText}`;
									}

									return (
										<div
											key={optIdx}
											className={`text-sm p-2 rounded border ${
												isCorrect
													? "bg-green-50 border-green-300"
													: "bg-gray-50 border-gray-200"
											}`}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1">
													<span
														className={
															isCorrect
																? "text-green-600 font-medium"
																: "text-gray-600"
														}
													>
														{displayLabel}
													</span>
													{isCorrect && <span className="ml-2">✓</span>}
												</div>
												{/* Display option image if exists - check both saved images and previews */}
												{((question as any).optionImages?.[optIdx] ||
													(question as any).optionImagePreviews?.[optIdx]) && (
													<img
														src={
															(question as any).optionImagePreviews?.[optIdx] ||
															getImageUrl(
																(question as any).optionImages?.[optIdx]
															)
														}
														alt={`Option ${String.fromCharCode(65 + optIdx)}`}
														className="w-16 h-16 object-contain rounded border"
													/>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
