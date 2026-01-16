import React from "react";
import { format } from "date-fns";

interface StartExamModalProps {
	isOpen: boolean;
	exam: {
		id: number;
		title: string;
		description?: string;
		duration: number;
		totalQuestions: number;
		startTime: string;
		endTime: string;
		requireToken?: boolean;
	};
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function StartExamModal({
	isOpen,
	exam,
	isLoading = false,
	onConfirm,
	onCancel,
}: StartExamModalProps) {
	if (!isOpen || !exam) return null;

	const startDate = new Date(exam.startTime);
	const endDate = new Date(exam.endTime);

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			onClick={onCancel}
			style={{ animation: "fadeIn 0.2s ease-out" }}
		>
			<div
				className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
				onClick={(e) => e.stopPropagation()}
				style={{ animation: "slideUp 0.3s ease-out" }}
			>
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<span>📝</span>
						Mulai Ujian
					</h2>
					<p className="text-blue-100 text-sm mt-1">{exam.title}</p>
				</div>

				{/* Body */}
				<div className="px-6 py-4 space-y-4">
					{/* Exam Details Grid */}
					<div className="grid grid-cols-2 gap-4">
						<div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
							<div className="text-xs text-gray-600 font-semibold">Durasi</div>
							<div className="text-lg font-bold text-blue-600 mt-1">
								{exam.duration} menit
							</div>
						</div>
						<div className="bg-green-50 p-3 rounded-lg border border-green-200">
							<div className="text-xs text-gray-600 font-semibold">
								Jumlah Soal
							</div>
							<div className="text-lg font-bold text-green-600 mt-1">
								{exam.totalQuestions}
							</div>
						</div>
					</div>

					{/* Schedule */}
					<div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
						<div className="text-xs text-gray-600 font-semibold mb-2">
							Jadwal Ujian
						</div>
						<div className="space-y-1 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Mulai:</span>
								<span className="font-semibold text-amber-600">
									{format(startDate, "dd MMM yyyy, HH:mm")}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Selesai:</span>
								<span className="font-semibold text-amber-600">
									{format(endDate, "HH:mm")}
								</span>
							</div>
						</div>
					</div>

					{/* Requirements */}
					<div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
						<div className="text-xs text-gray-600 font-semibold mb-2">
							Persyaratan
						</div>
						<ul className="text-sm space-y-1 text-gray-700">
							<li className="flex items-start gap-2">
								<span className="text-purple-600 mt-1">✓</span>
								<span>Pastikan koneksi internet stabil</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-purple-600 mt-1">✓</span>
								<span>Jangan tutup browser saat mengerjakan ujian</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-purple-600 mt-1">✓</span>
								<span>Waktu akan berjalan setelah Anda mulai</span>
							</li>
						</ul>
					</div>

					{/* Warning */}
					<div className="bg-red-50 p-3 rounded-lg border border-red-200 flex gap-2">
						<span className="text-red-600 text-xl flex-shrink-0">⚠️</span>
						<p className="text-sm text-red-700">
							Anda tidak akan bisa menghentikan ujian setelah memulai kecuali
							Anda menyelesaikan semua soal atau waktu berakhir.
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
					<button
						onClick={onCancel}
						disabled={isLoading}
						className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Batal
					</button>
					<button
						onClick={onConfirm}
						disabled={isLoading}
						className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? (
							<>
								<span
									className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
									style={{ animation: "spin 0.6s linear infinite" }}
								/>
								Memulai...
							</>
						) : (
							<>✓ Mulai Ujian</>
						)}
					</button>
				</div>
			</div>

			<style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
		</div>
	);
}
