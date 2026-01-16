import React, { useState } from "react";

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isDangerous?: boolean;
	isLoading?: boolean;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	title,
	message,
	confirmText = "Hapus",
	cancelText = "Batal",
	isDangerous = false,
	isLoading = false,
	onConfirm,
	onCancel,
}) => {
	const [confirming, setConfirming] = useState(false);

	if (!isOpen) return null;

	const handleConfirm = async () => {
		setConfirming(true);
		try {
			await onConfirm();
		} finally {
			setConfirming(false);
		}
	};

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-200"
				onClick={onCancel}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
				<div
					className="relative w-full max-w-sm transform rounded-lg bg-white shadow-xl transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
					style={{
						animation: "fadeInScale 0.3s ease-out",
					}}
				>
					{/* Header */}
					<div className="border-b border-gray-200 px-6 py-4">
						<h3 className="text-lg font-medium text-gray-900">{title}</h3>
					</div>

					{/* Body */}
					<div className="px-6 py-4">
						<p className="text-sm text-gray-600">{message}</p>
					</div>

					{/* Footer */}
					<div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button
							onClick={onCancel}
							disabled={isLoading || confirming}
							className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
						>
							{cancelText}
						</button>
						<button
							onClick={handleConfirm}
							disabled={isLoading || confirming}
							className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 ${
								isDangerous
									? "bg-red-600 hover:bg-red-700"
									: "bg-blue-600 hover:bg-blue-700"
							}`}
						>
							{confirming || isLoading ? (
								<>
									<div className="animate-spin">
										<svg
											className="h-4 w-4"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
									</div>
									<span>Memproses...</span>
								</>
							) : (
								confirmText
							)}
						</button>
					</div>
				</div>
			</div>

			<style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
		</>
	);
};

export default ConfirmationModal;
