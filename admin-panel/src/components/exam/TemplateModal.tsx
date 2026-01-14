import { Dispatch, SetStateAction } from "react";

interface TemplateConfig {
	multipleChoice: number;
	mixedMultipleChoice: number;
	trueFalse: number;
	essay: number;
}

interface TemplateModalProps {
	isOpen: boolean;
	onClose: () => void;
	templateConfig: TemplateConfig;
	setTemplateConfig: Dispatch<SetStateAction<TemplateConfig>>;
	onGenerate: () => void;
	generating: boolean;
}

export default function TemplateModal({
	isOpen,
	onClose,
	templateConfig,
	setTemplateConfig,
	onGenerate,
	generating,
}: TemplateModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
				<h2 className="text-xl font-bold mb-4">Buat Template Soal</h2>
				<p className="text-gray-600 text-sm mb-6">
					Tentukan jumlah soal untuk setiap tipe
				</p>

				<div className="space-y-4 mb-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Jumlah Soal Pilihan Ganda
						</label>
						<input
							type="number"
							min="0"
							value={templateConfig.multipleChoice}
							onChange={(e) =>
								setTemplateConfig({
									...templateConfig,
									multipleChoice: parseInt(e.target.value) || 0,
								})
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Jumlah Soal Pilihan Ganda Majemuk
						</label>
						<input
							type="number"
							min="0"
							value={templateConfig.mixedMultipleChoice}
							onChange={(e) =>
								setTemplateConfig({
									...templateConfig,
									mixedMultipleChoice: parseInt(e.target.value) || 0,
								})
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Jumlah Soal Benar/Salah
						</label>
						<input
							type="number"
							min="0"
							value={templateConfig.trueFalse}
							onChange={(e) =>
								setTemplateConfig({
									...templateConfig,
									trueFalse: parseInt(e.target.value) || 0,
								})
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Jumlah Soal Essay
						</label>
						<input
							type="number"
							min="0"
							value={templateConfig.essay}
							onChange={(e) =>
								setTemplateConfig({
									...templateConfig,
									essay: parseInt(e.target.value) || 0,
								})
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div className="bg-blue-50 p-3 rounded text-sm text-gray-700">
						<p className="font-medium">Total soal:</p>
						<p>
							{templateConfig.multipleChoice +
								templateConfig.mixedMultipleChoice +
								templateConfig.trueFalse +
								templateConfig.essay}{" "}
							soal
						</p>
					</div>
				</div>

				<div className="flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
						disabled={generating}
					>
						Batal
					</button>
					<button
						onClick={onGenerate}
						disabled={generating}
						className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{generating ? "Membuat..." : "Buat Template"}
					</button>
				</div>
			</div>
		</div>
	);
}
