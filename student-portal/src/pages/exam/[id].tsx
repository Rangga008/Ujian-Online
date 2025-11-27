import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ExamPage() {
	const router = useRouter();
	const { id } = router.query;

	const [exam, setExam] = useState<any>(null);
	const [submission, setSubmission] = useState<any>(null);
	const [questions, setQuestions] = useState<any[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [timeLeft, setTimeLeft] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			initExam();
		}
	}, [id]);

	useEffect(() => {
		if (timeLeft > 0) {
			const timer = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						handleSubmit();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [timeLeft]);

	const initExam = async () => {
		try {
			const [examRes, questionsRes] = await Promise.all([
				api.get(`/exams/${id}`),
				api.get(`/questions/exam/${id}`),
			]);

			setExam(examRes.data);
			setQuestions(questionsRes.data);

			// Start submission
			const submissionRes = await api.post(`/submissions/start/${id}`);
			setSubmission(submissionRes.data);

			// Calculate time left
			const duration = examRes.data.duration * 60; // Convert to seconds
			setTimeLeft(duration);

			setLoading(false);
		} catch (error: any) {
			toast.error("Gagal memuat ujian");
			router.push("/dashboard");
		}
	};

	const handleAnswer = async (questionId: number, answer: string) => {
		setAnswers({ ...answers, [questionId]: answer });

		if (submission) {
			try {
				await api.post(`/submissions/${submission.id}/answer`, {
					questionId,
					answer,
				});
			} catch (error) {
				console.error("Error saving answer:", error);
			}
		}
	};

	const handleSubmit = async () => {
		if (!submission) return;

		const confirmed = confirm("Yakin ingin mengumpulkan ujian?");
		if (!confirmed && timeLeft > 0) return;

		try {
			await api.post(`/submissions/${submission.id}/submit`);
			toast.success("Ujian berhasil dikumpulkan!");
			router.push("/dashboard");
		} catch (error) {
			toast.error("Gagal mengumpulkan ujian");
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	if (loading) {
		return (
			<Layout>
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Loading...</div>
				</div>
			</Layout>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];

	return (
		<Layout>
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="card mb-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
							<p className="text-gray-600">
								Soal {currentQuestionIndex + 1} dari {questions.length}
							</p>
						</div>
						<div className="text-right">
							<div
								className={`text-3xl font-bold ${
									timeLeft < 300 ? "text-red-600" : "text-primary-600"
								}`}
							>
								{formatTime(timeLeft)}
							</div>
							<p className="text-sm text-gray-600">Waktu Tersisa</p>
						</div>
					</div>
				</div>

				{/* Question */}
				<div className="card mb-6">
					<div className="mb-6">
						<div className="flex items-center gap-2 mb-4">
							<span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
								Soal {currentQuestionIndex + 1}
							</span>
							<span className="text-gray-600 text-sm">
								({currentQuestion.points} poin)
							</span>
						</div>
						<p className="text-lg text-gray-900 leading-relaxed">
							{currentQuestion.questionText}
						</p>
					</div>

					{/* Options */}
					<div className="space-y-3">
						{currentQuestion.options?.map((option: string, index: number) => (
							<label
								key={index}
								className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
									answers[currentQuestion.id] === option
										? "border-primary-500 bg-primary-50"
										: "border-gray-200 hover:border-primary-300"
								}`}
							>
								<input
									type="radio"
									name={`question-${currentQuestion.id}`}
									value={option}
									checked={answers[currentQuestion.id] === option}
									onChange={(e) =>
										handleAnswer(currentQuestion.id, e.target.value)
									}
									className="w-5 h-5 text-primary-600"
								/>
								<span className="ml-3 text-gray-900">{option}</span>
							</label>
						))}
					</div>
				</div>

				{/* Navigation */}
				<div className="flex items-center justify-between">
					<button
						onClick={() =>
							setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
						}
						disabled={currentQuestionIndex === 0}
						className="btn btn-secondary disabled:opacity-50"
					>
						← Sebelumnya
					</button>

					<div className="flex gap-2">
						{questions.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentQuestionIndex(index)}
								className={`w-10 h-10 rounded-lg font-medium ${
									index === currentQuestionIndex
										? "bg-primary-600 text-white"
										: answers[questions[index].id]
										? "bg-green-100 text-green-800"
										: "bg-gray-200 text-gray-600"
								}`}
							>
								{index + 1}
							</button>
						))}
					</div>

					{currentQuestionIndex === questions.length - 1 ? (
						<button onClick={handleSubmit} className="btn btn-success">
							Kumpulkan Ujian
						</button>
					) : (
						<button
							onClick={() =>
								setCurrentQuestionIndex(
									Math.min(questions.length - 1, currentQuestionIndex + 1)
								)
							}
							className="btn btn-primary"
						>
							Selanjutnya →
						</button>
					)}
				</div>
			</div>
		</Layout>
	);
}
