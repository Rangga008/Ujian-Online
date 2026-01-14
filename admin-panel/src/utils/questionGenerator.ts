/**
 * Question template generator
 * Generate sample questions for different question types
 */

interface TemplateConfig {
	multipleChoice: number;
	mixedMultipleChoice: number;
	trueFalse: number;
	essay: number;
}

export const generateTemplateQuestions = (config: TemplateConfig) => {
	const mcSamples = [
		{
			prompt: "Berapa hasil dari 2 + 3?",
			choices: ["3", "4", "5", "6", "7"],
			correct: "C",
		},
		{
			prompt: "Apa ibu kota Indonesia?",
			choices: ["Bandung", "Medan", "Jakarta", "Surabaya", "Makassar"],
			correct: "C",
		},
		{
			prompt: "Berapa banyak benua di dunia?",
			choices: ["5", "6", "7", "8", "9"],
			correct: "C",
		},
	];

	const mixedMCSamples = [
		{
			prompt: "Manakah yang termasuk planet di tata surya kita?",
			choices: ["Merkurius", "Venus", "Bintang Sirius", "Mars", "Nebula"],
			correctIndices: [0, 1, 3],
		},
		{
			prompt: "Negara-negara berikut terletak di Asia Tenggara, kecuali:",
			choices: ["Indonesia", "Thailand", "Filipina", "Vietnam", "Jepang"],
			correctIndices: [4],
		},
		{
			prompt: "Berikut ini adalah sumber energi terbarukan:",
			choices: [
				"Minyak bumi",
				"Energi matahari",
				"Gas alam",
				"Angin",
				"Panas bumi",
			],
			correctIndices: [1, 3, 4],
		},
	];

	const tfSamples = [
		{
			statement: "Bumi adalah planet terbesar di tata surya.",
			correct: "SALAH",
		},
		{
			statement: "Bumi mengelilingi Matahari.",
			correct: "BENAR",
		},
		{
			statement: "Air mendidih pada 100°C di permukaan laut.",
			correct: "BENAR",
		},
	];

	const essayPrompts = [
		"Jelaskan pentingnya menjaga lingkungan.",
		"Sebutkan lima negara anggota ASEAN.",
		"Uraikan proses fotosintesis pada tumbuhan.",
	];

	return {
		mcSamples,
		mixedMCSamples,
		tfSamples,
		essayPrompts,
		questionCount:
			config.multipleChoice +
			config.mixedMultipleChoice +
			config.trueFalse +
			config.essay,
	};
};

export type { TemplateConfig };
