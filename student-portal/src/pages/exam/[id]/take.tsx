import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getImageUrl } from "@/lib/imageUrl";
import Head from "next/head";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ExamTakePage() {
	const router = useRouter();
	const { id, submissionId } = router.query;
	const { isAuthenticated } = useAuthGuard();

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

	const handleAnswer = async (questionId: number, answer: string) => {
		if (submission && submission.status === "submitted") {
			toast.error("Ujian sudah dikumpulkan. Tidak bisa mengubah jawaban.");
			return;
		}

		const next = { ...answersRef.current };
		if (answer == null || answer.toString().trim() === "") {
			delete next[questionId];
		} else {
			next[questionId] = answer;
		}
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
				<div className="flex items-center justify-center h-64">
					<div className="text-xl">Menyiapkan ujian...</div>
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

	return (
		<>
			<Head>
				<title>{exam?.title} - Student Portal</title>
			</Head>
			<Layout hideBottomNav={true} hideDesktopNav={true}>
				<div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
					{/* Header */}
					<div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
						<div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
							<div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
								<div className="flex-1 min-w-0">
									<h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
										{exam?.title}
									</h1>
									<p className="text-xs sm:text-sm text-gray-600">
										Soal{" "}
										<span className="font-semibold">
											{currentQuestionIndex + 1}
										</span>{" "}
										dari{" "}
										<span className="font-semibold">{questions.length}</span>
									</p>
								</div>

								{/* Timer */}
								<div className="flex items-center gap-3">
									<div className="text-center">
										<div
											className={`text-2xl sm:text-3xl font-bold font-mono ${
												timeLeft < 300
													? "text-red-600"
													: timeLeft < 900
													? "text-orange-600"
													: "text-green-600"
											}`}
										>
											{formatTime(timeLeft)}
										</div>
										<p className="text-xs sm:text-sm text-gray-600">
											Sisa Waktu
										</p>
									</div>

									{/* Question List Toggle */}
									<button
										onClick={() => setShowQuestionList(!showQuestionList)}
										className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium text-xs sm:text-sm transition flex items-center gap-2"
									>
										<span>📋</span>
										<span className="hidden sm:inline">Semua Soal</span>
										<span className="sm:hidden">
											{answeredCount}/{questions.length}
										</span>
									</button>
								</div>
							</div>

							{lastSavedAt && (
								<div className="mt-2 text-right text-xs text-gray-500 flex items-center justify-end gap-1">
									<span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
									Tersimpan: {new Date(lastSavedAt).toLocaleTimeString()}
								</div>
							)}
						</div>
					</div>

					{/* Main Content */}
					<div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
						<div className="max-w-4xl mx-auto">
							{/* Question Card */}
							<div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
								<div className="flex items-center justify-between mb-4 sm:mb-6">
									<div className="flex items-center gap-2 sm:gap-3">
										<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
											Soal {currentQuestionIndex + 1}
										</span>
										<span className="text-gray-600 text-xs sm:text-sm font-medium">
											{currentQuestion?.points || 0} poin
										</span>
										{isAnswered && (
											<span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
												<span>✓</span>
												<span className="hidden sm:inline">Terjawab</span>
											</span>
										)}
									</div>
									<button
										onClick={() => setShowQuestionList(!showQuestionList)}
										className="md:hidden px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
									>
										📋
									</button>
								</div>

								{/* Question Image */}
								{currentQuestion?.imageUrl && (
									<div className="mb-4 sm:mb-6">
										<img
											src={getImageUrl(currentQuestion.imageUrl)}
											alt="question image"
											className="max-h-80 w-full object-contain rounded-lg"
										/>
									</div>
								)}

								{/* Question Text */}
								<div className="mb-6 sm:mb-8">
									<p className="text-base sm:text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">
										{currentQuestion?.questionText}
									</p>
								</div>

								{/* Answer Section */}
								<div className="space-y-3">
									{currentQuestion?.type === "essay" ? (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Jawaban Anda
											</label>
											<div className="space-y-3">
												{/* Text Answer */}
												<textarea
													className="w-full border-2 border-gray-300 rounded-lg p-3 sm:p-4 min-h-[140px] sm:min-h-[160px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-sm sm:text-base"
													value={answers[currentQuestion.id] || ""}
													onChange={(e) =>
														handleAnswer(currentQuestion.id, e.target.value)
													}
													disabled={submission?.status === "submitted"}
													placeholder="Ketik jawaban Anda di sini..."
												/>

												{/* Photo Answer - if enabled for this question */}
												{(currentQuestion as any).allowPhotoAnswer && (
													<div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
														<div className="flex items-start gap-2 sm:gap-3">
															<div className="text-2xl">📷</div>
															<div className="flex-1">
																<label className="block text-sm font-medium text-gray-700 mb-2">
																	Atau unggah foto jawaban Anda
																</label>
																<input
																	type="file"
																	accept="image/*"
																	disabled={submission?.status === "submitted"}
																	className="block w-full text-sm text-gray-500
																				file:mr-4 file:py-2 file:px-4
																				file:rounded file:border-0
																				file:text-sm file:font-semibold
																				file:bg-blue-50 file:text-blue-700
																				hover:file:bg-blue-100"
																	onChange={(e) => {
																		const file = e.target.files?.[0];
																		if (file) {
																			const reader = new FileReader();
																			reader.onloadend = () => {
																				// Store as data URL or handle file upload
																				handleAnswer(
																					currentQuestion.id,
																					(reader.result as string) || ""
																				);
																			};
																			reader.readAsDataURL(file);
																		}
																	}}
																/>
															</div>
														</div>
													</div>
												)}
											</div>
										</div>
									) : currentQuestion?.type === "mixed_multiple_choice" ? (
										<div className="space-y-3">
											<div>
												<p className="text-sm font-medium text-gray-700 mb-3">
													Pilih satu atau lebih jawaban yang benar:
												</p>
												<div className="space-y-2 sm:space-y-3">
													{currentQuestion?.options?.map(
														(option: string, index: number) => {
															// Parse answer as comma-separated indices (e.g., "0,2,3")
															const answerStr = (
																answers[currentQuestion.id] || ""
															).trim();
															const selectedIndices = answerStr
																? answerStr
																		.split(",")
																		.map((s) => parseInt(s, 10))
																: [];
															const isChecked = selectedIndices.includes(index);
															const optionImageUrl =
																currentQuestion?.optionImages?.[index];
															return (
																<label
																	key={index}
																	className={`flex flex-col p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
																		isChecked
																			? "border-green-500 bg-green-50 shadow-md"
																			: "border-gray-300 hover:border-blue-400 bg-white"
																	}`}
																>
																	<div className="flex items-start gap-3">
																		<input
																			type="checkbox"
																			checked={isChecked}
																			onChange={(e) =>
																				handleMixedMultipleChoice(
																					currentQuestion.id,
																					index,
																					e.target.checked
																				)
																			}
																			className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0 rounded"
																			disabled={
																				submission?.status === "submitted"
																			}
																		/>
																		<div className="flex-1">
																			<span className="text-gray-900 text-sm sm:text-base block">
																				{option ||
																					(optionImageUrl
																						? `Pilihan ${String.fromCharCode(
																								65 + index
																						  )}`
																						: "")}
																			</span>
																			{optionImageUrl && (
																				<img
																					src={getImageUrl(optionImageUrl)}
																					alt={`option ${index + 1}`}
																					className="mt-2 max-h-40 rounded-md object-contain"
																				/>
																			)}
																		</div>
																		{isChecked && (
																			<span className="text-green-600 font-bold text-xl flex-shrink-0">
																				✓
																			</span>
																		)}
																	</div>
																</label>
															);
														}
													)}
												</div>
											</div>
										</div>
									) : (
										<div className="space-y-3">
											<div>
												<p className="text-sm font-medium text-gray-700 mb-3">
													Pilih jawaban yang benar:
												</p>
												<div className="space-y-2 sm:space-y-3">
													{currentQuestion?.options?.map(
														(option: string, index: number) => {
															const optionImageUrl =
																currentQuestion?.optionImages?.[index];
															return (
																<label
																	key={index}
																	className={`flex flex-col p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
																		answers[currentQuestion.id] === option
																			? "border-green-500 bg-green-50 shadow-md"
																			: "border-gray-300 hover:border-blue-400 bg-white"
																	}`}
																>
																	<div className="flex items-start gap-3">
																		<input
																			type="radio"
																			name={`question-${currentQuestion.id}`}
																			value={option}
																			checked={
																				answers[currentQuestion.id] === option
																			}
																			onChange={(e) =>
																				handleAnswer(
																					currentQuestion.id,
																					e.target.value
																				)
																			}
																			className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
																			disabled={
																				submission?.status === "submitted"
																			}
																		/>
																		<div className="flex-1">
																			<span className="text-gray-900 text-sm sm:text-base block">
																				{option ||
																					(optionImageUrl
																						? `Pilihan ${String.fromCharCode(
																								65 + index
																						  )}`
																						: "")}
																			</span>
																			{optionImageUrl && (
																				<img
																					src={getImageUrl(optionImageUrl)}
																					alt={`option ${index + 1}`}
																					className="mt-2 max-h-40 rounded-md object-contain"
																				/>
																			)}
																		</div>
																		{answers[currentQuestion.id] === option && (
																			<span className="text-green-600 font-bold text-xl flex-shrink-0">
																				✓
																			</span>
																		)}
																	</div>
																</label>
															);
														}
													)}
												</div>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Navigation Buttons */}
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-20 sm:mb-6">
								<button
									onClick={() =>
										setCurrentQuestionIndex(
											Math.max(0, currentQuestionIndex - 1)
										)
									}
									disabled={currentQuestionIndex === 0}
									className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm sm:text-base transition flex items-center justify-center gap-2"
								>
									<span>←</span>
									<span>Sebelumnya</span>
								</button>

								<div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
									{questions.map((_, index) => (
										<button
											key={index}
											onClick={() => setCurrentQuestionIndex(index)}
											title={`Soal ${index + 1}${
												answers[questions[index].id]
													? " (terjawab)"
													: " (belum dijawab)"
											}`}
											className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-medium text-xs sm:text-sm transition-all ${
												index === currentQuestionIndex
													? "bg-blue-600 text-white shadow-lg scale-110"
													: answers[questions[index].id]
													? "bg-green-500 text-white hover:bg-green-600"
													: "bg-gray-300 text-gray-700 hover:bg-gray-400"
											}`}
										>
											{index === currentQuestionIndex ? (
												<span>●</span>
											) : answers[questions[index].id] ? (
												<span>✓</span>
											) : (
												index + 1
											)}
										</button>
									))}
								</div>

								{submission?.status === "submitted" ? (
									<button
										className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-400 text-white cursor-not-allowed rounded-lg font-medium text-sm sm:text-base"
										disabled
									>
										✓ Sudah Dikumpulkan
									</button>
								) : currentQuestionIndex === questions.length - 1 ? (
									<button
										onClick={() => setShowSubmitConfirm(true)}
										className="px-4 py-2 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2"
									>
										<span>📤</span>
										<span>Kumpulkan</span>
									</button>
								) : (
									<button
										onClick={() =>
											setCurrentQuestionIndex(
												Math.min(questions.length - 1, currentQuestionIndex + 1)
											)
										}
										className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2"
									>
										<span>Selanjutnya</span>
										<span>→</span>
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Question List Modal/Sidebar */}
					{showQuestionList && (
						<div
							className="fixed inset-0 z-50 bg-black bg-opacity-50 md:relative md:bg-transparent md:z-10"
							onClick={() => setShowQuestionList(false)}
						>
							<div
								className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-2xl md:shadow-none overflow-y-auto md:relative md:border-l md:border-gray-200"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
									<h2 className="text-lg font-bold text-gray-900">
										Daftar Soal
									</h2>
									<button
										onClick={() => setShowQuestionList(false)}
										className="md:hidden p-1 hover:bg-gray-200 rounded-lg"
									>
										✕
									</button>
								</div>

								<div className="p-4 space-y-2">
									<div className="mb-4 pb-4 border-b border-gray-200">
										<div className="text-sm text-gray-600">
											<p className="font-medium">
												Terjawab:{" "}
												<span className="text-green-600 font-bold">
													{answeredCount}
												</span>
											</p>
											<p className="font-medium">
												Belum:{" "}
												<span className="text-gray-600 font-bold">
													{questions.length - answeredCount}
												</span>
											</p>
										</div>
									</div>

									{questions.map((q, idx) => (
										<button
											key={q.id}
											onClick={() => {
												setCurrentQuestionIndex(idx);
												setShowQuestionList(false);
											}}
											className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
												idx === currentQuestionIndex
													? "border-blue-600 bg-blue-50"
													: answers[q.id]
													? "border-green-400 bg-green-50 hover:bg-green-100"
													: "border-gray-300 hover:border-gray-400 bg-white"
											}`}
										>
											<div className="flex items-center gap-2">
												<span className="font-medium text-gray-900">
													Soal {idx + 1}
												</span>
												{answers[q.id] && (
													<span className="text-green-600 font-bold">✓</span>
												)}
											</div>
											<p className="text-xs text-gray-600 mt-1 line-clamp-2">
												{q.questionText}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												{q.points} poin
											</p>
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</Layout>

			{/* Submit Confirmation Modal */}
			{showSubmitConfirm && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom-5 sm:scale-in-95">
						{/* Header */}
						<div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-6 rounded-t-3xl sm:rounded-t-2xl">
							<h2 className="text-2xl font-bold flex items-center gap-3">
								<span>⚠️</span>
								<span>Konfirmasi Pengumpulan</span>
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
										Masih ada {questions.length - answeredCount} soal yang belum
										dijawab
									</p>
								)}
							</div>

							{/* Warning Notice */}
							<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<div className="flex gap-3">
									<span className="text-2xl">🔴</span>
									<div>
										<p className="font-bold text-red-900 mb-1">
											⚠️ Perhatian Penting
										</p>
										<p className="text-sm text-red-800">
											Ujian ini{" "}
											<span className="font-bold">TIDAK BISA DIULANG</span>{" "}
											setelah dikumpulkan. Pastikan semua jawaban sudah benar
											sebelum melanjutkan.
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
						</div>

						{/* Actions */}
						<div className="border-t border-gray-200 px-6 py-4 flex gap-3 flex-col-reverse sm:flex-row">
							<button
								onClick={() => setShowSubmitConfirm(false)}
								disabled={isSubmitting}
								className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								<span>←</span>
								<span>Kembali Periksa</span>
							</button>
							<button
								onClick={handleSubmit}
								disabled={
									isSubmitting ||
									Object.keys(answers).length < (questions?.length || 0)
								}
								className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isSubmitting ? (
									<>
										<span className="inline-block animate-spin">⏳</span>
										<span>Mengumpulkan...</span>
									</>
								) : Object.keys(answers).length < (questions?.length || 0) ? (
									<>
										<span>⚠️</span>
										<span>Jawab Semua Soal Terlebih Dahulu</span>
									</>
								) : (
									<>
										<span>✓</span>
										<span>Ya, Kumpulkan Sekarang</span>
									</>
								)}
							</button>
						</div>
						<div className="mt-3">
							<button
								onClick={() => handleClearAnswer(currentQuestion.id)}
								disabled={submission?.status === "submitted"}
								className="text-sm text-red-600 hover:underline"
							>
								Batal / Hapus Jawaban
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
