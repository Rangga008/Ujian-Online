import { useState, Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import {
	Document,
	Packer,
	Table,
	TableCell,
	TableRow,
	Paragraph,
	TextRun,
	AlignmentType,
	VerticalAlign,
} from "docx";
import { generateTemplateQuestions } from "@/utils/questionGenerator";

interface TemplateConfig {
	multipleChoice: number;
	mixedMultipleChoice: number;
	trueFalse: number;
	essay: number;
}

interface UseTemplateGeneratorProps {
	templateConfig: TemplateConfig;
	setTemplateConfig: Dispatch<SetStateAction<TemplateConfig>>;
	showTemplateModal: boolean;
	setShowTemplateModal: Dispatch<SetStateAction<boolean>>;
}

export const useTemplateGenerator = ({
	templateConfig,
	setTemplateConfig,
	showTemplateModal,
	setShowTemplateModal,
}: UseTemplateGeneratorProps) => {
	const [generating, setGenerating] = useState(false);

	const handleGenerateTemplate = async () => {
		setGenerating(true);
		try {
			const samples = generateTemplateQuestions(templateConfig);
			const rows: any[] = [];
			let questionNumber = 1;

			// Header row
			rows.push(
				new TableRow({
					height: { value: 800, rule: "atLeast" },
					children: [
						new TableCell({
							width: { size: 8, type: "pct" },
							children: [
								new Paragraph({
									alignment: AlignmentType.CENTER,
									children: [new TextRun({ text: "No", bold: true, size: 24 })],
								}),
							],
							shading: { fill: "CCCCCC" },
							verticalAlign: VerticalAlign.CENTER,
						}),
						new TableCell({
							width: { size: 20, type: "pct" },
							children: [
								new Paragraph({
									alignment: AlignmentType.CENTER,
									children: [
										new TextRun({
											text: "Jenis Soal",
											bold: true,
											size: 24,
										}),
									],
								}),
							],
							shading: { fill: "CCCCCC" },
							verticalAlign: VerticalAlign.CENTER,
						}),
						new TableCell({
							width: { size: 40, type: "pct" },
							children: [
								new Paragraph({
									alignment: AlignmentType.CENTER,
									children: [
										new TextRun({ text: "Isi", bold: true, size: 24 }),
									],
								}),
							],
							shading: { fill: "CCCCCC" },
							verticalAlign: VerticalAlign.CENTER,
						}),
						new TableCell({
							width: { size: 32, type: "pct" },
							children: [
								new Paragraph({
									alignment: AlignmentType.CENTER,
									children: [
										new TextRun({
											text: "Jawaban",
											bold: true,
											size: 24,
										}),
									],
								}),
							],
							shading: { fill: "CCCCCC" },
							verticalAlign: VerticalAlign.CENTER,
						}),
					],
				})
			);

			// Helper to add multiple choice question
			const addMCQuestion = (sampleIdx: number) => {
				const sample = samples.mcSamples[sampleIdx % samples.mcSamples.length];
				const letters = ["A", "B", "C", "D", "E"];

				rows.push(
					new TableRow({
						height: { value: 1000, rule: "atLeast" },
						children: [
							new TableCell({
								width: { size: 8, type: "pct" },
								rowSpan: 6,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: questionNumber.toString(),
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 20, type: "pct" },
								rowSpan: 6,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: "Pilihan\nGanda",
												bold: true,
												size: 20,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 40, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.prompt,
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
							new TableCell({
								width: { size: 32, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.correct,
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
						],
					})
				);

				for (let idx = 0; idx < sample.choices.length; idx++) {
					const choice = sample.choices[idx];
					const letter = letters[idx];
					const isCorrect = letter === sample.correct;

					rows.push(
						new TableRow({
							height: { value: 700, rule: "atLeast" },
							children: [
								new TableCell({
									width: { size: 40, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: `${letter}. ${choice}${isCorrect ? " ✓" : ""}`,
													size: 20,
													bold: isCorrect,
													color: isCorrect ? "00B050" : "000000",
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
								new TableCell({
									width: { size: 32, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: "☐",
													size: 20,
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
							],
						})
					);
				}

				questionNumber++;
			};

			// Helper to add mixed multiple choice question
			const addMixedMCQuestion = (sampleIdx: number) => {
				const sample =
					samples.mixedMCSamples[sampleIdx % samples.mixedMCSamples.length];
				const letters = ["A", "B", "C", "D", "E"];

				rows.push(
					new TableRow({
						height: { value: 1000, rule: "atLeast" },
						children: [
							new TableCell({
								width: { size: 8, type: "pct" },
								rowSpan: 6,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: questionNumber.toString(),
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 20, type: "pct" },
								rowSpan: 6,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: "SOAL",
												bold: true,
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 40, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.prompt +
													" (Bisa lebih dari satu jawaban)",
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
							new TableCell({
								width: { size: 32, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.correctIndices
													.map((i) => letters[i])
													.join(", "),
												size: 24,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
						],
					})
				);

				for (let idx = 0; idx < sample.choices.length; idx++) {
					const choice = sample.choices[idx];
					const letter = letters[idx];
					const isCorrect = sample.correctIndices.includes(idx);

					rows.push(
						new TableRow({
							height: { value: 700, rule: "atLeast" },
							children: [
								new TableCell({
									width: { size: 40, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: `${letter}. ${choice}${isCorrect ? " ✓" : ""}`,
													size: 20,
													bold: isCorrect,
													color: isCorrect ? "00B050" : "000000",
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
								new TableCell({
									width: { size: 32, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: "☐",
													size: 20,
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
							],
						})
					);
				}

				questionNumber++;
			};

			// Helper to add true/false question
			const addTFQuestion = (sampleIdx: number) => {
				const sample = samples.tfSamples[sampleIdx % samples.tfSamples.length];

				rows.push(
					new TableRow({
						height: { value: 1000, rule: "atLeast" },
						children: [
							new TableCell({
								width: { size: 8, type: "pct" },
								rowSpan: 3,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: questionNumber.toString(),
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 20, type: "pct" },
								rowSpan: 3,
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: "Benar/\nSalah",
												bold: true,
												size: 20,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 40, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.statement,
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
							new TableCell({
								width: { size: 32, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: sample.correct,
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
						],
					})
				);

				["BENAR", "SALAH"].forEach((option) => {
					const isCorrect = option === sample.correct;
					rows.push(
						new TableRow({
							height: { value: 700, rule: "atLeast" },
							children: [
								new TableCell({
									width: { size: 40, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: `${option}${isCorrect ? " ✓" : ""}`,
													size: 20,
													bold: isCorrect,
													color: isCorrect ? "00B050" : "000000",
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
								new TableCell({
									width: { size: 32, type: "pct" },
									children: [
										new Paragraph({
											children: [
												new TextRun({
													text: "☐",
													size: 20,
												}),
											],
										}),
									],
									verticalAlign: VerticalAlign.CENTER,
								}),
							],
						})
					);
				});

				questionNumber++;
			};

			// Helper to add essay question
			const addEssayQuestion = (sampleIdx: number) => {
				const prompt =
					samples.essayPrompts[sampleIdx % samples.essayPrompts.length];

				rows.push(
					new TableRow({
						height: { value: 1400, rule: "atLeast" },
						children: [
							new TableCell({
								width: { size: 8, type: "pct" },
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: questionNumber.toString(),
												size: 24,
												bold: true,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 20, type: "pct" },
								children: [
									new Paragraph({
										alignment: AlignmentType.CENTER,
										children: [
											new TextRun({
												text: "Essay",
												bold: true,
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
								shading: { fill: "FFFFCC" },
							}),
							new TableCell({
								width: { size: 40, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: prompt,
												size: 22,
											}),
										],
									}),
								],
								verticalAlign: VerticalAlign.CENTER,
							}),
							new TableCell({
								width: { size: 32, type: "pct" },
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: "Rubrik:\n- Kelengkapan\n- Kebenaran\n- Kejelasan",
												size: 18,
											}),
										],
										spacing: { line: 200 },
									}),
								],
								verticalAlign: VerticalAlign.TOP,
							}),
						],
					})
				);

				questionNumber++;
			};

			// Generate questions
			for (let i = 0; i < templateConfig.multipleChoice; i++) {
				addMCQuestion(i);
			}
			for (let i = 0; i < templateConfig.mixedMultipleChoice; i++) {
				addMixedMCQuestion(i);
			}
			for (let i = 0; i < templateConfig.trueFalse; i++) {
				addTFQuestion(i);
			}
			for (let i = 0; i < templateConfig.essay; i++) {
				addEssayQuestion(i);
			}

			const tableObj = new Table({
				rows,
				width: { size: 100, type: "pct" },
			});

			const doc = new Document({
				sections: [
					{
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: "Template Soal Ujian",
										bold: true,
										size: 32,
									}),
								],
								alignment: AlignmentType.CENTER,
								spacing: { after: 200 },
							}),
							new Paragraph({
								children: [
									new TextRun(
										`Total Soal: ${samples.questionCount}`
									),
								],
								spacing: { after: 400 },
							}),
							tableObj,
						],
					},
				],
			});

			const blob = await Packer.toBlob(doc);
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "template-soal.docx");
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);

			toast.success("Template berhasil diunduh");
			setShowTemplateModal(false);
		} catch (err) {
			console.error("Failed to generate template", err);
			toast.error("Gagal membuat template");
		} finally {
			setGenerating(false);
		}
	};

	return {
		generating,
		handleGenerateTemplate,
	};
};
