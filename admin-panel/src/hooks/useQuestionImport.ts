import { useState, useRef, Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import { Question } from "@/types/exam";
import { parseMarkdownToQuestions, parseHtmlTablesToQuestions } from "@/utils/questionParser";

interface UseQuestionImportProps {
	questions: Question[];
	setQuestions: Dispatch<SetStateAction<Question[]>>;
}

export const useQuestionImport = ({
	questions,
	setQuestions,
}: UseQuestionImportProps) => {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [importing, setImporting] = useState(false);

	const handleImportFromWord = async (file: File) => {
		setImporting(true);
		try {
			let mammoth: any;
			try {
				mammoth = await import("mammoth/mammoth.browser");
			} catch (_e1) {
				try {
					mammoth = await import("mammoth");
				} catch (_e2) {
					console.error("Could not import mammoth:", _e1, _e2);
					toast.error(
						"Perpustakaan mammoth tidak tersedia. Pastikan sudah diinstal."
					);
					setImporting(false);
					return;
				}
			}

			const buffer = await file.arrayBuffer();

			const htmlResult = await mammoth.convertToHtml(
				{ arrayBuffer: buffer },
				{
					convertImage: mammoth.images.inline(async (element: any) => {
						const base64 = await element.read("base64");
						return { src: `data:${element.contentType};base64,${base64}` };
					}),
				}
			);

			let parsed = parseHtmlTablesToQuestions(
				htmlResult.value || "",
				questions.length
			);

			if (!parsed.length) {
				const mdResult = await mammoth.convertToMarkdown(
					{ arrayBuffer: buffer },
					{
						convertImage: mammoth.images.inline(async (element: any) => {
							const base64 = await element.read("base64");
							return { src: `data:${element.contentType};base64,${base64}` };
						}),
					}
				);
				parsed = parseMarkdownToQuestions(mdResult.value || "", questions.length);
			}

			if (!parsed.length) {
				console.warn("No questions parsed from import");
				toast.error(
					"Tidak ada soal yang berhasil diimpor. Pastikan file menggunakan format tabel Word seperti template atau format markdown dengan pemisah '---'."
				);
				setImporting(false);
				return;
			}

			setQuestions((prev) => {
				const merged = [...prev];
				parsed.forEach((p: Question, idx: number) => {
					merged.push({ ...p, orderIndex: merged.length + idx });
				});
				return merged;
			});

			toast.success(`Berhasil mengimpor ${parsed.length} soal`);
		} catch (error) {
			console.error("Import soal gagal", error);
			toast.error(
				"Gagal mengimpor soal. Gunakan file .docx sesuai template dan coba lagi."
			);
		} finally {
			setImporting(false);
		}
	};

	const handleImportInputChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (file) {
			try {
				await handleImportFromWord(file);
			} catch (error) {
				console.error("Error in handleImportInputChange:", error);
				toast.error("Gagal memproses file");
			}
		}
		e.target.value = "";
	};

	const triggerImport = () => {
		fileInputRef.current?.click();
	};

	return {
		importing,
		triggerImport,
		handleImportInputChange,
		fileInputRef,
	};
};
