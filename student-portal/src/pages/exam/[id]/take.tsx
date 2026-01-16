import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getImageUrl } from "@/lib/imageUrl";
import Head from "next/head";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAntiCheat } from "@/hooks/useAntiCheat";

export default function ExamTakePage() {
	const router = useRouter();
	const { id, submissionId } = router.query;
	const { isAuthenticated } = useAuthGuard();
	const { isMobile, windowBlurred, activateAntiCheat } = useAntiCheat();

	const [exam, setExam] = useState<any>(null);
	const [submission, setSubmission] = useState<any>(null);
	const [questions, setQuestions] = useState<any[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

	// Helper function to shuffle array (Fisher-Yates)
	const shuffleArray = (array: any[]) => {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	};
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [timeLeft, setTimeLeft] = useState(0);
	const [loading, setLoading] = useState(true);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [showQuestionList, setShowQuestionList] = useState(false);
	const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
	const [fontSize, setFontSize] = useState(1); // 1 = normal, 1.2 = besar, 0.9 = kecil

	const answersRef = useRef<Record<number, string>>({});
	const submissionRef = useRef<any>(null);
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

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

	// Anti-cheat and fullscreen effects
	useEffect(() => {
		if (!loading && isMobile) {
			// Activate anti-cheat for mobile
			activateAntiCheat();
		}
	}, [loading, isMobile]);

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

	useAutosave(answersRef, submissionRef, setLastSavedAt);

	useEffect(() => {
		if (id && submissionId) {
			initTake();
		}
	}, [id, submissionId]);

	const initTake = async () => {
		try {
			const [examRes, questionsRes] = await Promise.all([
				api.get(`/exams/${id}`),
				api.get(`/questions/exam/${id}`),
			]);

			setExam(examRes.data);
			const loadedQuestions = questionsRes.data || [];

			// Apply randomization if enabled
			const questionList = examRes.data?.randomizeQuestions
				? shuffleArray(loadedQuestions)
				: loadedQuestions;

			setQuestions(questionList);

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
			// Only include non-empty answers as "answered" in client state
			(full.answers || []).forEach((a: any) => {
				if (a.answer && a.answer.toString().trim() !== "") {
					ansMap[a.questionId] = a.answer;
				}
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

	const handleAnswer = async (
		questionId: number,
		answerValue: number | string
	) => {
		if (submission && submission.status === "submitted") {
			toast.error("Ujian sudah dikumpulkan. Tidak bisa mengubah jawaban.");
			return;
		}

		const next = { ...answersRef.current };
		if (
			answerValue == null ||
			(typeof answerValue === "string" && answerValue.trim() === "")
		) {
			delete next[questionId];
		} else {
			// Convert to string for storage
			next[questionId] = String(answerValue);
		}
		setAnswers(next);
		answersRef.current = next;

		if (submission && submission.status === "in_progress") {
			try {
				await api.post(`/submissions/${submission.id}/answer`, {
					questionId,
					answer: String(answerValue), // Send as string
				});
			} catch (e) {
				console.error("Error saving answer:", e);
			}
		}
	};

	const handleMixedMultipleChoice = async (
		questionId: number,
		optionIndex: number,
		isChecked: boolean
	) => {
		if (submission && submission.status === "submitted") {
			toast.error("Ujian sudah dikumpulkan. Tidak bisa mengubah jawaban.");
			return;
		}

		// For MMC, store answers as comma-separated numeric indices (e.g., "0,2,3")
		// This works for both text and photo-only options
		const currentAnswersStr = (answersRef.current[questionId] || "").trim();
		const currentIndices = currentAnswersStr
			? currentAnswersStr.split(",").map((s) => parseInt(s, 10))
			: [];

		let newIndices: number[];

		if (isChecked) {
			// Add index if not already selected
			if (!currentIndices.includes(optionIndex)) {
				newIndices = [...currentIndices, optionIndex].sort((a, b) => a - b);
			} else {
				newIndices = currentIndices;
			}
		} else {
			// Remove index
			newIndices = currentIndices.filter((i) => i !== optionIndex);
		}

		const answerString = newIndices.length > 0 ? newIndices.join(",") : "";
		const next = { ...answersRef.current };

		if (answerString === "") {
			delete next[questionId];
		} else {
			next[questionId] = answerString;
		}

		setAnswers(next);
		answersRef.current = next;

		if (submission && submission.status === "in_progress") {
			try {
				await api.post(`/submissions/${submission.id}/answer`, {
					questionId,
					answer: answerString,
				});
			} catch (e) {
				console.error("Error saving answer:", e);
			}
		}
	};

	const handleClearAnswer = async (questionId: number) => {
		const next = { ...answersRef.current };
		delete next[questionId];
		setAnswers(next);
		answersRef.current = next;

		if (submission && submission.status === "in_progress") {
			try {
				await api.post(`/submissions/${submission.id}/answer`, {
					questionId,
					answer: "",
				});
			} catch (e) {
				console.error("Error clearing answer:", e);
			}
		}
	};

	const handleSubmit = async () => {
		if (!submission) return;

		setIsSubmitting(true);
		try {
			// Prevent final submission if there are unanswered questions
			const total = questions.length;
			const unanswered = questions.filter((q) => {
				const a = answers[q?.id];
				return !(a != null && a.toString().trim() !== "");
			}).length;
			if (unanswered > 0) {
				toast.error(
					`Masih ada ${unanswered} soal belum dijawab. Harap jawab semua soal sebelum mengumpulkan.`
				);
				setShowSubmitConfirm(false);
				return;
			}

			await api.post(`/submissions/${submission.id}/submit`);
			toast.success("Ujian berhasil dikumpulkan!");
			setSubmission({ ...submission, status: "submitted" });
			submissionRef.current = { ...submission, status: "submitted" };
			setIsSubmitted(true);
			setShowSubmitConfirm(false);
			setTimeout(() => {
				router.push("/dashboard");
			}, 1500);
		} catch (error) {
			toast.error("Gagal mengumpulkan ujian");
		} finally {
			setIsSubmitting(false);
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
			<Layout hideBottomNav={true} hideDesktopNav={true}>
				<div className="flex items-center justify-center min-h-screen md:h-64 px-4">
					<div className="text-lg md:text-xl">Menyiapkan ujian...</div>
				</div>
			</Layout>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];
	const isAnswered =
		currentQuestion &&
		answers[currentQuestion.id] != null &&
		answers[currentQuestion.id].toString().trim() !== "";
	const answeredCount = questions.filter((q) => {
		const a = answers[q.id];
		return a != null && a.toString().trim() !== "";
	}).length;

	// Helper function to check if question type is MMC (Multiple Multiple Choice)
	const isMMCType = (type: string) => {
		if (!type) return false;
		const lowerType = type.toLowerCase();
		return (
			lowerType === "mixed_multiple_choice" ||
			lowerType === "mmc" ||
			lowerType === "majemuk" ||
			lowerType === "multiple_choice_mixed" ||
			lowerType === "multiple-choice-mixed"
		);
	};

	// MOBILE LAYOUT
	if (isMobile) {
		return (
			<>
				<Head>
					<title>{exam?.title} - Student Portal</title>
					<meta name="viewport" content="width=device-width, initial-scale=1" />
				</Head>
				<Layout hideBottomNav={true} hideDesktopNav={true} hideFooter={true}>
					<div
						className="fixed inset-0 bg-white flex flex-col z-50"
						style={{ fontSize: `${fontSize * 100}%` }}
					>
						{/* Mobile Header */}
						<div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
							<div className="px-3 py-2">
								{/* Top Row */}
								<div className="flex items-center justify-between mb-2">
									<div className="text-sm font-bold truncate">
										Soal {currentQuestionIndex + 1}/{questions.length}
									</div>
									<div className="text-center">
										<div
											className={`text-lg md:text-2xl font-bold font-mono ${
												timeLeft < 300 ? "text-red-300" : "text-white"
											}`}
										>
											{formatTime(timeLeft)}
										</div>
									</div>
									<button
										onClick={() => setShowQuestionList(!showQuestionList)}
										className="px-2.5 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-bold transition whitespace-nowrap flex items-center gap-1"
									>
										📋 Soal
									</button>
								</div>

								{/* Bottom Row - Controls */}
								<div className="flex gap-2 text-xs">
									<button
										onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))}
										className="px-2 py-0.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
									>
										A−
									</button>
									<button
										onClick={() => setFontSize(1)}
										className={`px-2 py-0.5 rounded transition ${
											fontSize === 1
												? "bg-white text-blue-600"
												: "bg-white bg-opacity-20 hover:bg-opacity-30"
										}`}
									>
										A
									</button>
									<button
										onClick={() => setFontSize(Math.min(1.4, fontSize + 0.1))}
										className="px-2 py-0.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
									>
										A+
									</button>
									{windowBlurred && (
										<div className="ml-auto px-2 py-0.5 bg-red-400 rounded text-xs font-bold animate-pulse">
											⚠️ PERHATIAN: APP TIDAK AKTIF
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Mobile Content Area */}
						<div className="flex-1 overflow-y-auto pb-20 flex flex-col items-center justify-center">
							<div className="px-3 py-4 w-full max-w-md">
								{/* Question */}
								<h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 leading-relaxed">
									{currentQuestion?.questionText}
								</h2>

								{/* Question Image */}
								{currentQuestion?.imageUrl && (
									<div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
										<img
											src={getImageUrl(currentQuestion.imageUrl)}
											alt="soal"
											className="w-full h-auto object-contain"
										/>
									</div>
								)}

								{/* Options */}
								<div className="space-y-2 mb-4">
									{currentQuestion?.type === "essay" ? (
										<textarea
											className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm min-h-32 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
											value={answers[currentQuestion.id] || ""}
											onChange={(e) =>
												handleAnswer(currentQuestion.id, e.target.value)
											}
											disabled={submission?.status === "submitted"}
											placeholder="Ketik jawaban Anda..."
										/>
									) : isMMCType(currentQuestion?.type) ? (
										currentQuestion.options?.map((option: any, idx: number) => {
											const answerStr = (
												answers[currentQuestion.id] || ""
											).trim();
											const isAnswered = answerStr
												? answerStr
														.split(",")
														.map((s) => parseInt(s))
														.includes(idx)
												: false;
											const hasImage = currentQuestion.optionImages?.[idx];

											return (
												<label
													key={idx}
													className="flex items-start gap-2 p-2.5 border-2 border-gray-300 rounded-lg active:border-blue-500 transition bg-white"
												>
													<input
														type="checkbox"
														checked={isAnswered}
														onChange={(e) =>
															handleMixedMultipleChoice(
																currentQuestion.id,
																idx,
																e.target.checked
															)
														}
														disabled={submission?.status === "submitted"}
														className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-2 flex-shrink-0"
													/>
													<div className="flex-1 min-w-0">
														{hasImage ? (
															<img
																src={getImageUrl(hasImage)}
																alt={`opsi ${String.fromCharCode(65 + idx)}`}
																className="h-16 w-auto rounded"
															/>
														) : (
															<span className="font-medium text-gray-900">
																{String.fromCharCode(65 + idx)}. {option}
															</span>
														)}
													</div>
												</label>
											);
										})
									) : (
										currentQuestion.options?.map((option: any, idx: number) => {
											const isAnswered =
												answers[currentQuestion.id] === String(idx);
											const hasImage = currentQuestion.optionImages?.[idx];

											return (
												<label
													key={idx}
													className="flex items-start gap-2 p-2.5 border-2 border-gray-300 rounded-lg active:border-blue-500 transition bg-white"
												>
													<input
														type="radio"
														name={`question-${currentQuestion.id}`}
														value={String(idx)}
														checked={isAnswered}
														onChange={() =>
															handleAnswer(currentQuestion.id, idx)
														}
														disabled={submission?.status === "submitted"}
														className="w-5 h-5 mt-0.5 text-blue-600 focus:ring-2 flex-shrink-0"
													/>
													<div className="flex-1 min-w-0">
														{hasImage ? (
															<img
																src={getImageUrl(hasImage)}
																alt={`opsi ${String.fromCharCode(65 + idx)}`}
																className="h-16 w-auto rounded"
															/>
														) : (
															<span className="font-medium text-gray-900">
																{String.fromCharCode(65 + idx)}. {option}
															</span>
														)}
													</div>
												</label>
											);
										})
									)}
								</div>
							</div>
						</div>

						{/* Mobile Bottom Bar */}
						<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 px-3 py-2 flex gap-1.5 shadow-lg">
							<button
								onClick={() =>
									setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
								}
								disabled={currentQuestionIndex === 0}
								className="flex-1 px-2 py-2 text-xs font-bold bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-800 rounded transition"
							>
								← Prev
							</button>
							<button
								onClick={() => handleClearAnswer(currentQuestion.id)}
								className="flex-1 px-2 py-2 text-xs font-bold bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded transition"
							>
								🔄 Ragu
							</button>
							<button
								onClick={() => {
									if (currentQuestionIndex === questions.length - 1) {
										setShowSubmitConfirm(true);
									} else {
										setCurrentQuestionIndex(
											Math.min(questions.length - 1, currentQuestionIndex + 1)
										);
									}
								}}
								className="flex-1 px-2 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition"
							>
								{currentQuestionIndex === questions.length - 1
									? "Kumpul →"
									: "Next →"}
							</button>
						</div>

						{/* Question List Modal - Mobile */}
						{showQuestionList && (
							<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
								<div className="bg-white rounded-t-3xl w-full px-4 py-4 max-h-96 overflow-y-auto">
									<div className="flex items-center justify-between mb-3">
										<h2 className="text-lg font-bold">Daftar Soal</h2>
										<button
											onClick={() => setShowQuestionList(false)}
											className="text-2xl text-gray-400 hover:text-gray-600"
										>
											×
										</button>
									</div>

									{/* Stats */}
									<div className="flex gap-3 mb-4 pb-3 border-b">
										<div className="flex-1 bg-green-50 px-3 py-2 rounded">
											<p className="text-xs text-gray-600 font-bold">
												Terjawab
											</p>
											<p className="text-lg font-bold text-green-600">
												{answeredCount}
											</p>
										</div>
										<div className="flex-1 bg-gray-50 px-3 py-2 rounded">
											<p className="text-xs text-gray-600 font-bold">Belum</p>
											<p className="text-lg font-bold text-gray-600">
												{questions.length - answeredCount}
											</p>
										</div>
									</div>

									{/* Grid */}
									<div className="grid grid-cols-8 gap-1.5 mb-4">
										{questions.map((q: any, idx: number) => {
											const isAnswered =
												answers[q.id] != null &&
												answers[q.id].toString().trim() !== "";
											return (
												<button
													key={idx}
													onClick={() => {
														setCurrentQuestionIndex(idx);
														setShowQuestionList(false);
													}}
													className={`p-1.5 rounded font-bold text-xs transition ${
														idx === currentQuestionIndex
															? "bg-blue-600 text-white ring-2 ring-blue-400"
															: isAnswered
															? "bg-green-500 text-white"
															: "bg-gray-200 text-gray-700"
													}`}
												>
													{isAnswered ? "✓" : idx + 1}
												</button>
											);
										})}
									</div>

									<button
										onClick={() => {
											setShowSubmitConfirm(true);
											setShowQuestionList(false);
										}}
										disabled={answeredCount < questions.length}
										className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm transition"
									>
										Kumpulkan
									</button>
								</div>
							</div>
						)}

						{/* Submit Confirmation - Mobile */}
						{showSubmitConfirm && (
							<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
								<div className="bg-white rounded-t-3xl w-full px-4 py-4">
									<h2 className="text-lg font-bold mb-2">
										Konfirmasi Pengumpulan
									</h2>

									<div className="space-y-3 mb-4">
										<p className="text-sm text-gray-700">
											Soal terjawab:{" "}
											<span className="font-bold text-green-600">
												{answeredCount}
											</span>{" "}
											dari <span className="font-bold">{questions.length}</span>
										</p>

										{questions.length - answeredCount > 0 && (
											<div className="bg-orange-50 border border-orange-200 p-3 rounded">
												<p className="text-sm text-orange-800 font-bold">
													Masih ada {questions.length - answeredCount} soal
													belum dijawab
												</p>
											</div>
										)}

										<div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
											<p className="font-bold text-red-900 text-sm mb-1">
												⚠️ PERHATIAN
											</p>
											<p className="text-xs text-red-800">
												Ujian ini{" "}
												<span className="font-bold">TIDAK BISA DIULANG</span>{" "}
												setelah dikumpulkan.
											</p>
										</div>
									</div>

									<div className="flex gap-2">
										<button
											onClick={() => setShowSubmitConfirm(false)}
											className="flex-1 px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold transition"
										>
											Batal
										</button>
										<button
											onClick={handleSubmit}
											disabled={
												isSubmitting || answeredCount < questions.length
											}
											className="flex-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
										>
											{isSubmitting ? "..." : "Kumpulkan"}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</Layout>
			</>
		);
	}

	// DESKTOP LAYOUT (existing design preserved)
	return (
		<>
			<Head>
				<title>{exam?.title} - Student Portal</title>
			</Head>
			<Layout hideBottomNav={true} hideDesktopNav={true} hideFooter={true}>
				<div
					className="min-h-screen flex flex-col bg-white"
					style={{ fontSize: `${fontSize * 100}%` }}
				>
					{/* Desktop Header */}
					<div className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
						<div className="px-6 py-4">
							<div className="flex items-center justify-between gap-4 mb-4">
								{/* Left: Font Controls */}
								<div className="flex items-center gap-3">
									<span className="text-sm font-medium">Ukuran:</span>
									<button
										onClick={() => setFontSize(0.9)}
										className={`px-2.5 py-1 rounded font-bold transition ${
											fontSize === 0.9
												? "bg-white text-blue-600"
												: "bg-blue-500 text-white hover:bg-blue-400"
										}`}
									>
										A
									</button>
									<button
										onClick={() => setFontSize(1)}
										className={`px-3 py-1 rounded font-bold transition ${
											fontSize === 1
												? "bg-white text-blue-600"
												: "bg-blue-500 text-white hover:bg-blue-400"
										}`}
									>
										A
									</button>
									<button
										onClick={() => setFontSize(1.2)}
										className={`px-2.5 py-1 rounded font-bold transition ${
											fontSize === 1.2
												? "bg-white text-blue-600"
												: "bg-blue-500 text-white hover:bg-blue-400"
										}`}
										style={{ fontSize: "1.2em" }}
									>
										A
									</button>
								</div>

								{/* Middle: Title & Question Progress */}
								<div className="text-center flex-1">
									<h1 className="font-bold">{exam?.title}</h1>
									<p className="text-sm text-blue-100">
										Soal {currentQuestionIndex + 1} dari {questions.length}
									</p>
								</div>

								{/* Right: Timer & Buttons */}
								<div className="flex items-center gap-4">
									<div className="text-center min-w-fit">
										<div
											className={`text-2xl font-bold font-mono ${
												timeLeft < 300 ? "text-red-300" : "text-white"
											}`}
										>
											{formatTime(timeLeft)}
										</div>
										<p className="text-xs text-blue-100">Sisa Waktu</p>
									</div>
									<button
										onClick={() => setShowQuestionList(!showQuestionList)}
										className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-semibold text-sm transition"
									>
										Daftar Soal
									</button>
								</div>
							</div>

							{/* Exam Meta Info */}
							<div className="text-sm text-blue-100 flex gap-6">
								<span>📝 {currentQuestion?.points || 0} poin</span>
								{isAnswered && <span>✓ Terjawab</span>}
							</div>
						</div>
					</div>
					{/* Main Content - Two Column Layout */}
					<div className="flex-1 flex overflow-hidden">
						{/* Left Column: Question & Image */}
						<div className="flex-1 overflow-y-auto border-r border-gray-300">
							<div className="p-6 max-w-2xl">
								{/* Question Text */}
								<h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
									{currentQuestion?.questionText}
								</h2>

								{/* Question Image */}
								{currentQuestion?.imageUrl && (
									<div className="mb-8">
										<img
											src={getImageUrl(currentQuestion.imageUrl)}
											alt="soal"
											className="max-h-96 w-full object-contain rounded-lg"
										/>
									</div>
								)}
							</div>
						</div>

						{/* Right Column: Options & Controls */}
						<div className="w-1/2 overflow-y-auto bg-gray-50 border-l border-gray-300">
							<div className="p-6">
								{/* Answer Options */}
								<div className="space-y-3 mb-8">
									{currentQuestion?.type === "essay" ? (
										<>
											<label className="block text-sm font-semibold text-gray-700 mb-3">
												Jawaban Anda
											</label>
											<textarea
												className="w-full border-2 border-gray-300 rounded-lg p-4 min-h-40 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
												value={answers[currentQuestion.id] || ""}
												onChange={(e) =>
													handleAnswer(currentQuestion.id, e.target.value)
												}
												disabled={submission?.status === "submitted"}
												placeholder="Ketik jawaban Anda..."
											/>
										</>
									) : isMMCType(currentQuestion?.type) ? (
										// Multiple Multiple Choice
										currentQuestion.options?.map((option: any, idx: number) => {
											const answerStr = (
												answers[currentQuestion.id] || ""
											).trim();
											const isAnswered = answerStr
												? answerStr
														.split(",")
														.map((s) => parseInt(s))
														.includes(idx)
												: false;
											const hasImage = currentQuestion.optionImages?.[idx];

											return (
												<label
													key={idx}
													className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition"
												>
													<input
														type="checkbox"
														checked={isAnswered}
														onChange={(e) =>
															handleMixedMultipleChoice(
																currentQuestion.id,
																idx,
																e.target.checked
															)
														}
														disabled={submission?.status === "submitted"}
														className="w-5 h-5 text-blue-600 rounded focus:ring-2"
													/>
													<div className="flex-1">
														{hasImage ? (
															<img
																src={getImageUrl(hasImage)}
																alt={`opsi ${String.fromCharCode(65 + idx)}`}
																className="h-20 w-auto rounded"
															/>
														) : (
															<span className="font-medium text-gray-900">
																{String.fromCharCode(65 + idx)}. {option}
															</span>
														)}
													</div>
												</label>
											);
										})
									) : (
										// Multiple Choice
										currentQuestion.options?.map((option: any, idx: number) => {
											const isAnswered =
												answers[currentQuestion.id] === String(idx);
											const hasImage = currentQuestion.optionImages?.[idx];

											return (
												<label
													key={idx}
													className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition"
												>
													<input
														type="radio"
														name={`question-${currentQuestion.id}`}
														value={String(idx)}
														checked={isAnswered}
														onChange={() =>
															handleAnswer(currentQuestion.id, idx)
														}
														disabled={submission?.status === "submitted"}
														className="w-5 h-5 text-blue-600 focus:ring-2"
													/>
													<div className="flex-1">
														{hasImage ? (
															<img
																src={getImageUrl(hasImage)}
																alt={`opsi ${String.fromCharCode(65 + idx)}`}
																className="h-20 w-auto rounded"
															/>
														) : (
															<span className="font-medium text-gray-900">
																{String.fromCharCode(65 + idx)}. {option}
															</span>
														)}
													</div>
												</label>
											);
										})
									)}
								</div>

								{/* Action Buttons */}
								<div className="flex gap-3 pt-6 border-t border-gray-300">
									<button
										onClick={() =>
											setCurrentQuestionIndex(
												Math.max(0, currentQuestionIndex - 1)
											)
										}
										disabled={currentQuestionIndex === 0}
										className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
									>
										← Sebelumnya
									</button>
									<button
										onClick={() => handleClearAnswer(currentQuestion.id)}
										className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition"
									>
										🔄 Ragu-ragu
									</button>
									{currentQuestionIndex === questions.length - 1 ? (
										<button
											onClick={() => setShowSubmitConfirm(true)}
											className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
										>
											Kumpulkan →
										</button>
									) : (
										<button
											onClick={() =>
												setCurrentQuestionIndex(
													Math.min(
														questions.length - 1,
														currentQuestionIndex + 1
													)
												)
											}
											className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
										>
											Selanjutnya →
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
				{/* Question List Modal */}
				{showQuestionList && (
					<div
						className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
						onClick={() => setShowQuestionList(false)}
					>
						<div
							className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-bold text-gray-900">Daftar Soal</h2>
								<button
									onClick={() => setShowQuestionList(false)}
									className="text-gray-400 hover:text-gray-600 transition p-1"
								>
									<svg
										className="w-6 h-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							{/* Stats */}
							<div className="flex gap-6 mb-5 pb-5 border-b border-gray-200">
								<div className="bg-green-50 px-4 py-2 rounded-lg">
									<p className="text-xs text-gray-600 font-medium">Terjawab</p>
									<p className="text-lg font-bold text-green-600">
										{answeredCount}
									</p>
								</div>
								<div className="bg-gray-50 px-4 py-2 rounded-lg">
									<p className="text-xs text-gray-600 font-medium">Belum</p>
									<p className="text-lg font-bold text-gray-600">
										{questions.length - answeredCount}
									</p>
								</div>
							</div>

							{/* Question Grid */}
							<div className="grid grid-cols-6 gap-2 mb-6">
								{questions.map((q: any, idx: number) => {
									const isAnswered =
										answers[q.id] != null &&
										answers[q.id].toString().trim() !== "";
									return (
										<button
											key={idx}
											onClick={() => {
												setCurrentQuestionIndex(idx);
												setShowQuestionList(false);
											}}
											className={`w-12 h-12 rounded-lg font-bold text-xs transition flex items-center justify-center shadow-sm hover:shadow-md ${
												idx === currentQuestionIndex
													? "bg-blue-600 text-white ring-2 ring-blue-400"
													: isAnswered
													? "bg-green-500 text-white hover:bg-green-600"
													: "bg-gray-200 text-gray-700 hover:bg-gray-300"
											}`}
										>
											{isAnswered ? "✓" : idx + 1}
										</button>
									);
								})}
							</div>

							<button
								onClick={() => setShowSubmitConfirm(true)}
								disabled={answeredCount < questions.length}
								className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition shadow-md hover:shadow-lg"
							>
								Kumpulkan Ujian
							</button>
						</div>
					</div>
				)}

				{/* Submit Confirmation Modal */}
				{showSubmitConfirm && (
					<div
						className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
						onClick={() => setShowSubmitConfirm(false)}
					>
						<div
							className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
								<h2 className="text-xl font-bold text-white">
									Konfirmasi Pengumpulan
								</h2>
							</div>

							{/* Content */}
							<div className="px-6 py-6 space-y-5">
								<div>
									<p className="text-gray-900 font-medium mb-2">
										Anda yakin ingin mengumpulkan ujian?
									</p>
									<p className="text-sm text-gray-600">
										Soal yang terjawab:{" "}
										<span className="font-bold text-green-600">
											{answeredCount}
										</span>{" "}
										dari <span className="font-bold">{questions.length}</span>
									</p>
									{questions.length - answeredCount > 0 && (
										<p className="text-sm text-orange-600 font-medium mt-2">
											Masih ada {questions.length - answeredCount} soal yang
											belum dijawab
										</p>
									)}
								</div>

								{/* Warning Notice */}
								<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
									<div className="flex gap-3">
										<span className="text-xl">⚠️</span>
										<div>
											<p className="font-bold text-red-900 mb-1">
												Perhatian Penting
											</p>
											<p className="text-sm text-red-800">
												Ujian ini{" "}
												<span className="font-bold">TIDAK BISA DIULANG</span>{" "}
												setelah dikumpulkan.
											</p>
										</div>
									</div>
								</div>

								{/* Remaining Time */}
								{timeLeft > 0 && (
									<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
										<p className="text-sm text-blue-800">
											<span className="font-bold">
												Sisa waktu: {formatTime(timeLeft)}
											</span>
											<br />
											Anda masih punya waktu untuk memeriksa kembali jawaban.
										</p>
									</div>
								)}

								{/* Buttons */}
								<div className="flex gap-3 pt-4">
									<button
										onClick={() => setShowSubmitConfirm(false)}
										className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
									>
										Batal
									</button>
									<button
										onClick={handleSubmit}
										disabled={isSubmitting || answeredCount < questions.length}
										className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
									>
										{isSubmitting ? "Mengirim..." : "Ya, Kumpulkan"}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</Layout>
		</>
	);
}
