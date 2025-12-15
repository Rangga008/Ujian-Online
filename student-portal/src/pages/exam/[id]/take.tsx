import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getImageUrl } from "@/lib/imageUrl";

export default function ExamTakePage() {
	const router = useRouter();
	const { id, submissionId } = router.query;

	const [exam, setExam] = useState<any>(null);
	const [submission, setSubmission] = useState<any>(null);
	const [questions, setQuestions] = useState<any[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [timeLeft, setTimeLeft] = useState(0);
	const [loading, setLoading] = useState(true);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const answersRef = useRef<Record<number, string>>({});
	const submissionRef = useRef<any>(null);

	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

	useAutosave(answersRef, submissionRef, setLastSavedAt);
					{lastSavedAt && (
						<div className="mt-2 text-right text-xs text-gray-500">Tersimpan: {new Date(lastSavedAt).toLocaleTimeString()}</div>
					)}

					{/* fullscreen hint / CTA */}
					{!fullscreenEnabled && (
						<div className="mt-3 flex items-center justify-end gap-3">
							<div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded">Mode layar penuh disarankan</div>
							<button onClick={tryFullscreen} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Masuk Layar Penuh</button>
						</div>
					)}
			initTake();
		}
	}, [id, submissionId]);

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

	const tryFullscreen = async () => {
		try {
			const el = document.documentElement as any;
			if (el.requestFullscreen) await el.requestFullscreen();
			else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
			// update fullscreen flag after attempting
			if (document.fullscreenElement) setFullscreenEnabled(true);
		} catch (e) {
			// ignore
		}
	};

	const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

	useEffect(() => {
		const onFullChange = () =>
			setFullscreenEnabled(Boolean(document.fullscreenElement));

		const onVisibility = () => {
			if (
				document.visibilityState === "visible" &&
				!document.fullscreenElement
			) {
				// best-effort re-request (may be blocked by browser)
				tryFullscreen();
			}
		};

		const onFocus = () => {
			if (!document.fullscreenElement) tryFullscreen();
		};

		const onContextMenu = (e: Event) => {
			e.preventDefault();
		};

		const onKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (
				e.key === "F5" ||
				(e.ctrlKey && key === "r") ||
				(e.metaKey && key === "r")
			) {
				e.preventDefault();
				toast.error("Refresh dinonaktifkan selama ujian");
			}
		};

		document.addEventListener("fullscreenchange", onFullChange);
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("focus", onFocus);
		document.addEventListener("contextmenu", onContextMenu);
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("fullscreenchange", onFullChange);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("contextmenu", onContextMenu);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	// autosave: keep track of last saved answers to avoid duplicate posts
	const useAutosave = (
		answersRef: React.MutableRefObject<Record<number, string>>,
		submissionRef: React.MutableRefObject<any>,
		setLastSaved: (t: number | null) => void
	) => {
		useEffect(() => {
			let mounted = true;

			const saveAll = async () => {
				const submission = submissionRef.current;
				const answers = answersRef.current;
				if (!submission || submission.status !== "in_progress") return;

				try {
					for (const [qId, ans] of Object.entries(answers)) {
						await api.post(`/submissions/${submission.id}/answer`, {
							questionId: Number(qId),
							answer: ans,
						});
					}
					if (mounted) setLastSaved(Date.now());
				} catch (e) {
					console.error("autosave error:", e);
				}
			};

			const iv = setInterval(() => {
				saveAll();
			}, 20000);

			const onUnload = (e: BeforeUnloadEvent) => {
				saveAll();
				e.preventDefault();
				e.returnValue = "";
			};

			window.addEventListener("beforeunload", onUnload);

			return () => {
				mounted = false;
				clearInterval(iv);
				window.removeEventListener("beforeunload", onUnload);
			};
		}, [answersRef, submissionRef]);
	};

	const initTake = async () => {
		try {
			const [examRes, questionsRes] = await Promise.all([
				api.get(`/exams/${id}`),
				api.get(`/questions/exam/${id}`),
			]);

			setExam(examRes.data);
			setQuestions(questionsRes.data || []);

			// Load submission either by query param or from my-submissions
			let full: any = null;
			if (submissionId) {
				const fullSubRes = await api.get(`/submissions/${submissionId}`);
				full = fullSubRes.data;
			} else {
				const mySubsRes = await api.get(`/submissions/my-submissions`);
				const mySubs = mySubsRes.data || [];
				const existing = mySubs.find((s: any) => s.exam?.id === Number(id));
				if (existing) {
					const fullSubRes = await api.get(`/submissions/${existing.id}`);
					full = fullSubRes.data;
				}
			}

			if (!full) {
				toast.error("Tidak ada session ujian. Kembali ke halaman detail.");
				router.push(`/exam/${id}`);
				return;
			}

			setSubmission(full);
			submissionRef.current = full;
			setIsSubmitted(full.status === "submitted");

			const ansMap: Record<number, string> = {};
			(full.answers || []).forEach((a: any) => {
				ansMap[a.questionId] = a.answer;
			});
			setAnswers(ansMap);

			if (full.status === "in_progress") {
				const duration = examRes.data.duration * 60;
				const started = new Date(full.startedAt).getTime();
				const elapsed = Math.floor((Date.now() - started) / 1000);
				setTimeLeft(Math.max(0, duration - elapsed));

				const firstUnanswered = questionsRes.data.findIndex(
					(q: any) => !ansMap[q.id]
				);
				if (firstUnanswered >= 0) setCurrentQuestionIndex(firstUnanswered);
			}

			// Try request fullscreen (best-effort)
			tryFullscreen();

			setLoading(false);
		} catch (error: any) {
			toast.error("Gagal memulai sesi ujian");
			router.push(`/exam/${id}`);
		}
	};

	const handleAnswer = async (questionId: number, answer: string) => {
		if (submission && submission.status === "submitted") {
			toast.error("Ujian sudah dikumpulkan. Tidak bisa mengubah jawaban.");
			return;
		}

		const next = { ...answersRef.current, [questionId]: answer };
		setAnswers(next);
		answersRef.current = next;

		if (submission && submission.status === "in_progress") {
			try {
				await api.post(`/submissions/${submission.id}/answer`, {
					questionId,
					answer,
				});
			} catch (e) {
				console.error("Error saving answer:", e);
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
			setSubmission({ ...submission, status: "submitted" });
			submissionRef.current = { ...submission, status: "submitted" };
			setIsSubmitted(true);
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
					<div className="text-xl">Menyiapkan ujian...</div>
				</div>
			</Layout>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];

	return (
		<Layout>
			<div className="max-w-4xl mx-auto">
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
					{lastSavedAt && (
						<div className="mt-2 text-right text-xs text-gray-500">
							Tersimpan: {new Date(lastSavedAt).toLocaleTimeString()}
						</div>
					)}
				</div>

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
						{currentQuestion.imageUrl && (
							<div className="mb-4">
								<img
									src={getImageUrl(currentQuestion.imageUrl)}
									alt="question image"
									className="max-h-64 w-full object-contain rounded"
								/>
							</div>
						)}
						<p className="text-lg text-gray-900 leading-relaxed">
							{currentQuestion.questionText}
						</p>
					</div>

					<div className="space-y-3">
						{currentQuestion.type === "essay" ? (
							<textarea
								className="w-full border rounded p-3 min-h-[120px]"
								value={answers[currentQuestion.id] || ""}
								onChange={(e) =>
									handleAnswer(currentQuestion.id, e.target.value)
								}
								disabled={submission?.status === "submitted"}
							/>
						) : (
							currentQuestion.options?.map((option: string, index: number) => (
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
										disabled={submission?.status === "submitted"}
									/>
									<span className="ml-3 text-gray-900">{option}</span>
								</label>
							))
						)}
					</div>
				</div>

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

					{submission.status === "submitted" ? (
						<button
							className="btn btn-secondary disabled:opacity-50"
							onClick={() => router.push("/history")}
						>
							Ujian sudah dikumpulkan
						</button>
					) : currentQuestionIndex === questions.length - 1 ? (
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
