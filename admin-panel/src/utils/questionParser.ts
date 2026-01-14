import { Question } from "@/types/exam";

/**
 * Convert base64 data URL to File object
 */
export const dataUrlToFile = (
	dataUrl: string,
	filename: string
): File | null => {
	try {
		const arr = dataUrl.split(",");
		if (arr.length < 2) return null;
		const mimeMatch = arr[0].match(/:(.*?);/);
		const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
		const bstr = atob(arr[1]);
		let n = bstr.length;
		const u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new File([u8arr], filename, { type: mime });
	} catch (err) {
		console.error("Failed to convert dataUrl to File", err);
		return null;
	}
};

/**
 * Parse markdown format to Question objects
 * Format: Type: ... Question: ... Options: A. ... Correct: ...
 */
export const parseMarkdownToQuestions = (
	markdown: string,
	existingQuestionsCount: number = 0
): Question[] => {
	const blocks = markdown
		.split(/\n-{3,}\n/)
		.map((b) => b.trim())
		.filter(Boolean);

	const nextQuestions: Question[] = [];

	blocks.forEach((block, blockIndex) => {
		const lines = block
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (!lines.length) return;

		let type: Question["type"] | string = "multiple_choice";
		let points = 10;
		let correctAnswer = "";
		let questionText = "";
		let options: string[] = [];
		let imageDataUrl: string | undefined;
		let optionImages: { preview: string; base64: string }[] = [];

		lines.forEach((line) => {
			const lower = line.toLowerCase();
			if (lower.startsWith("type:")) {
				const raw = line.split(":").slice(1).join(":").trim().toLowerCase();
				if (
					raw === "mixed_multiple_choice" ||
					raw === "mixed" ||
					raw === "majemuk"
				) {
					type = "mixed_multiple_choice";
				} else if (raw === "true_false" || raw === "true/false") {
					type = "true_false";
				} else if (raw === "essay" || raw === "esai") {
					type = "essay";
				} else {
					type = "multiple_choice";
				}
				return;
			}

			if (lower.startsWith("points:")) {
				const val = parseInt(line.split(":").slice(1).join(":").trim(), 10);
				if (!Number.isNaN(val)) points = val;
				return;
			}

			if (lower.startsWith("correct:")) {
				correctAnswer = line.split(":").slice(1).join(":").trim();
				return;
			}

			if (lower.startsWith("question:")) {
				questionText = line.split(":").slice(1).join(":").trim();
				return;
			}

			// Question image
			if (
				/^!\[[^\]]*\]\((data:[^)]+)\)/.test(line) ||
				/^!\[[^\]]*\]\((https?:[^)]+)\)/.test(line)
			) {
				const dataMatch = line.match(/!\[[^\]]*\]\((data:[^)]+)\)/);
				const urlMatch = line.match(/!\[[^\]]*\]\((https?:[^)]+)\)/);
				if (dataMatch?.[1]) {
					imageDataUrl = dataMatch[1];
				} else if (urlMatch?.[1]) {
					imageDataUrl = urlMatch[1];
				}
				return;
			}

			// Option image
			const optionImageMatch = line.match(
				/^\[([A-E])\]!\[\]\((data:[^)]+|https?:[^)]+)\)/
			);
			if (optionImageMatch) {
				const [, letter, imgSrc] = optionImageMatch;
				const idx = letter.charCodeAt(0) - 65;
				while (optionImages.length <= idx) {
					optionImages.push({ preview: "", base64: "" });
				}
				optionImages[idx] = {
					preview: imgSrc,
					base64: imgSrc.startsWith("data:") ? imgSrc : "",
				};
				return;
			}

			if (/^[A-E][\.)]/i.test(line)) {
				options.push(line.replace(/^[A-E][\.)]\s*/, "").trim());
				return;
			}

			questionText = questionText ? `${questionText}\n${line}` : line;
		});

		const mapCorrectAnswer = (
			value: string,
			currentType: Question["type"],
			opts: string[]
		) => {
			if (!value) return "";
			if (currentType === "multiple_choice") {
				const letter = value.trim().toUpperCase();
				if (/^[A-E]$/.test(letter) && opts.length) {
					const idx = letter.charCodeAt(0) - 65;
					return opts[idx] || value;
				}
				return value;
			}

			if (currentType === "mixed_multiple_choice") {
				const letters = value
					.split(/[,;]/)
					.map((v) => v.trim().toUpperCase())
					.filter(Boolean);
				const mapped = letters
					.map((ltr) => {
						if (/^[A-E]$/.test(ltr) && opts.length) {
							const idx = ltr.charCodeAt(0) - 65;
							return opts[idx];
						}
						return ltr;
					})
					.filter(Boolean);
				return mapped.join(",");
			}

			return value;
		};

		const resolvedType = ((): Question["type"] => {
			if (type === "mixed_multiple_choice") return "mixed_multiple_choice";
			if (type === "true_false") return "true_false";
			if (type === "essay") return "essay";
			return "multiple_choice";
		})();

		const resolvedOptions = (
			["essay", "true_false"] as Question["type"][]
		).includes(resolvedType)
			? []
			: options.length
			? options
			: ["", ""];

		const resolvedCorrect = (["essay"] as Question["type"][]).includes(
			resolvedType
		)
			? ""
			: resolvedType === "true_false"
			? correctAnswer === "Salah"
				? "Salah"
				: "Benar"
			: mapCorrectAnswer(correctAnswer, resolvedType, resolvedOptions);

		if (!questionText.trim()) return;

		const questionObj: Question = {
			questionText: questionText.trim(),
			type: resolvedType,
			options: resolvedOptions,
			correctAnswer: resolvedCorrect,
			points: points > 0 ? points : 1,
			orderIndex: existingQuestionsCount + nextQuestions.length,
			imageFile:
				imageDataUrl && imageDataUrl.startsWith("data:")
					? dataUrlToFile(
							imageDataUrl,
							`imported-${Date.now()}-${blockIndex}.png`
					  )
					: null,
			imageUrl:
				imageDataUrl && !imageDataUrl.startsWith("data:") ? imageDataUrl : "",
		};

		if (optionImages.some((img) => img.preview)) {
			questionObj.optionImages = optionImages
				.filter((img) => img.preview)
				.map((img) => img.base64 || img.preview);
			questionObj.optionImagePreviews = optionImages
				.filter((img) => img.preview)
				.map((img) => img.preview);
		}

		nextQuestions.push(questionObj);
	});

	return nextQuestions;
};

/**
 * Parse HTML tables from Word document to Question objects
 */
export const parseHtmlTablesToQuestions = (
	html: string,
	existingQuestionsCount: number = 0
): Question[] => {
	const parsed: Question[] = [];
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const tables = Array.from(doc.querySelectorAll("table"));

		if (!tables.length) return parsed;

		tables.forEach((table) => {
			const rows = Array.from(table.querySelectorAll("tr"));

			const questionsMap = new Map<number, HTMLTableRowElement[]>();
			let currentQuestionNum = 0;

			rows.forEach((row) => {
				const cells = Array.from(row.querySelectorAll("td, th"));
				if (!cells.length) return;

				const firstCell = cells[0];
				const firstCellText = (firstCell.textContent || "").trim();

				if (/^(No|Jenis|Isi|Jawaban)/.test(firstCellText)) {
					return;
				}

				const numMatch = firstCellText.match(/^\d+/);
				if (numMatch) {
					const qNum = parseInt(numMatch[0], 10);
					if (!questionsMap.has(qNum)) {
						questionsMap.set(qNum, []);
					}
					questionsMap.get(qNum)!.push(row);
					currentQuestionNum = qNum;
				} else if (currentQuestionNum > 0) {
					questionsMap.get(currentQuestionNum)!.push(row);
				}
			});

			questionsMap.forEach((questionRows) => {
				let type: Question["type"] = "multiple_choice";
				let points = 10;
				let questionText = "";
				let options: string[] = [];
				let correctAnswer = "";
				let imageSrc: string | undefined;
				const optionImagesMap = new Map<
					number,
					{ preview: string; base64: string }
				>();

				// First pass: extract question text, correct answer, and question image
				for (const row of questionRows) {
					const cells = Array.from(row.querySelectorAll("td, th"));
					if (cells.length < 2) continue;

					// Get question text from "Isi" column (index 2)
					if (!questionText && cells.length >= 4) {
						const contentCell = cells[2];
						const text = (contentCell.textContent || "").trim();
						if (text && text.length > 5 && text !== "SOAL") {
							questionText = text;
							// Extract question image (if any) from content cell
							const img = contentCell.querySelector("img");
							if (img?.getAttribute("src"))
								imageSrc = img.getAttribute("src") || undefined;
						}
					}

					// Get correct answer from "Jawaban" column (index 3)
					if (cells.length >= 4 && !correctAnswer) {
						const answerCell = cells[3];
						const text = (answerCell.textContent || "").trim();
						if (text && text !== "☐") {
							correctAnswer = text;
						}
					}
				}

				// Second pass: extract options text
				const mcOptions: string[] = [];
				const tfOptions: string[] = [];

				for (const row of questionRows) {
					const cells = Array.from(row.querySelectorAll("td, th"));
					cells.forEach((cell) => {
						const optionText = (cell.textContent || "").trim();

						if (
							optionText.match(/^[A-E]\./) &&
							!mcOptions.includes(optionText)
						) {
							const cleaned = optionText.replace(/^[A-E]\.\s*/, "").trim();
							mcOptions.push(cleaned); // Allow empty string for photo-only options
						}

						if (
							(optionText === "BENAR" || optionText === "SALAH") &&
							!tfOptions.includes(optionText)
						) {
							tfOptions.push(optionText);
						}
					});
				}

				// Third pass: extract images for each option by row position
				// Important: Map images to options by their position in the table rows
				for (const row of questionRows) {
					const cells = Array.from(row.querySelectorAll("td, th"));

					// Look for option cells (cells with "A.", "B.", etc.) or option image cells
					let currentOptionIndex = -1;

					for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
						const cell = cells[cellIdx];
						const cellText = (cell.textContent || "").trim();

						// Detect option marker (A., B., C., D., E., BENAR, SALAH)
						const optionMatch = cellText.match(/^([A-E])\./);
						if (optionMatch) {
							currentOptionIndex = optionMatch[1].charCodeAt(0) - 65;
						}

						// Check for images in this cell
						const img = cell.querySelector("img");
						if (img?.getAttribute("src") && currentOptionIndex >= 0) {
							const imgSrc = img.getAttribute("src") || "";
							optionImagesMap.set(currentOptionIndex, {
								preview: imgSrc,
								base64: imgSrc.startsWith("data:") ? imgSrc : "",
							});
						}
					}
				}

				// Handle text/photo-only option inconsistency
				// If options were extracted but some are empty, fill array to match
				if (mcOptions.length > 0) {
					// Ensure we have an option slot for each image position
					const maxImageIndex = Math.max(
						...Array.from(optionImagesMap.keys()),
						-1
					);
					if (maxImageIndex >= 0) {
						while (mcOptions.length <= maxImageIndex) {
							mcOptions.push(""); // Add empty slots for photo-only options
						}
					}
				}

				if (!questionText) return;

				let isMixedMultiple = false;
				if (tfOptions.length > 0) {
					type = "true_false";
					options = tfOptions;
				} else if (mcOptions.length > 0) {
					type = "multiple_choice";
					options = mcOptions;

					if (correctAnswer) {
						const answers = correctAnswer
							.split(/[,;|\/]+/)
							.map((x: string) => x.trim().toUpperCase())
							.filter(Boolean);
						if (answers.length > 1) {
							type = "mixed_multiple_choice";
							isMixedMultiple = true;
						}
					}
				} else {
					type = "essay";
					options = [];
				}

				let resolvedCorrect = "";
				if (type === "true_false") {
					resolvedCorrect = correctAnswer.toLowerCase().includes("salah")
						? "Salah"
						: "Benar";
				} else if (type === "essay") {
					resolvedCorrect = "";
				} else if (isMixedMultiple) {
					const answers = correctAnswer
						.split(/[,;|\/]+/)
						.map((x: string) => x.trim().toUpperCase())
						.filter(Boolean);
					const indices = answers
						.map((ans: string) => {
							if (/^[A-E]$/.test(ans)) {
								return ans.charCodeAt(0) - 65;
							}
							return -1;
						})
						.filter((idx: number) => idx >= 0);
					resolvedCorrect = indices.join(",");
				} else {
					if (correctAnswer) {
						const letter = correctAnswer.toUpperCase().trim();
						if (/^[A-E]$/.test(letter)) {
							const idx = letter.charCodeAt(0) - 65;
							resolvedCorrect = options[idx] || correctAnswer;
						} else {
							resolvedCorrect = correctAnswer;
						}
					}
				}

				const resolvedOptions =
					type === "essay" ? [] : options.length > 0 ? options : ["", ""];

				const questionObj: Question = {
					questionText,
					type,
					options: resolvedOptions,
					correctAnswer: resolvedCorrect,
					points: points > 0 ? points : 1,
					orderIndex: existingQuestionsCount + parsed.length,
					imageFile: null,
					imageUrl: imageSrc || "",
				};

				// Add option images from map
				if (optionImagesMap.size > 0) {
					const optionImagesArray: string[] = [];
					const optionImagePreviewsArray: string[] = [];

					for (let i = 0; i < resolvedOptions.length; i++) {
						const imgData = optionImagesMap.get(i);
						if (imgData) {
							optionImagesArray.push(imgData.base64 || imgData.preview);
							optionImagePreviewsArray.push(imgData.preview);
						} else {
							optionImagesArray.push("");
							optionImagePreviewsArray.push("");
						}
					}

					if (optionImagesArray.some((img) => img)) {
						questionObj.optionImages = optionImagesArray;
						questionObj.optionImagePreviews = optionImagePreviewsArray;
					}
				}

				parsed.push(questionObj);
			});
		});
	} catch (err) {
		console.error("parseHtmlTablesToQuestions failed", err);
		return [];
	}

	return parsed;
};
