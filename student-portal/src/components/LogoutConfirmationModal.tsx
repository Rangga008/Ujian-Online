import React from "react";

interface LogoutConfirmationModalProps {
	isOpen: boolean;
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function LogoutConfirmationModal({
	isOpen,
	isLoading = false,
	onConfirm,
	onCancel,
}: LogoutConfirmationModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			onClick={onCancel}
			style={{ animation: "fadeIn 0.2s ease-out" }}
		>
			<div
				className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
				onClick={(e) => e.stopPropagation()}
				style={{ animation: "slideUp 0.3s ease-out" }}
			>
				{/* Header */}
				<div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<span>⚠️</span>
						Konfirmasi Logout
					</h2>
				</div>

				{/* Body */}
				<div className="px-6 py-4">
					<p className="text-gray-700 mb-2">Anda akan keluar dari akun Anda.</p>
					<p className="text-sm text-gray-600">
						Pastikan Anda telah menyimpan pekerjaan Anda. Anda akan perlu login
						kembali untuk mengakses ujian.
					</p>
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
						className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? (
							<>
								<span
									className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
									style={{ animation: "spin 0.6s linear infinite" }}
								/>
								Logout...
							</>
						) : (
							<>🚪 Logout</>
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
