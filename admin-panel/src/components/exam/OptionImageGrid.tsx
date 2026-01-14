import React from "react";
import { getImageUrl } from "@/lib/imageUrl";

interface OptionImageGridProps {
	options: string[];
	optionImages?: string[];
	optionImagePreviews?: string[];
	correctAnswer?: string;
	type?: string;
	disabled?: boolean;
}

/**
 * Component to display option images in a grid
 */
export default function OptionImageGrid({
	options,
	optionImages = [],
	optionImagePreviews = [],
	correctAnswer,
	type = "multiple_choice",
	disabled = false,
}: OptionImageGridProps) {
	if (options.length === 0) return null;

	const hasAnyImages =
		optionImages.some((img) => img) || optionImagePreviews.some((img) => img);

	if (!hasAnyImages) return null;

	const getImageUrl_ = (imgUrl: string) => {
		if (!imgUrl) return "";
		// If it's a preview (data URL), use as is
		if (imgUrl.startsWith("data:")) return imgUrl;
		// Otherwise use the imageUrl helper
		return getImageUrl(imgUrl);
	};

	return (
		<div className="mt-4">
			<p className="text-sm font-medium text-gray-700 mb-3">
				📸 Gambar Pilihan:
			</p>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{options.map((option, idx) => {
					const hasImage = optionImages?.[idx] || optionImagePreviews?.[idx];
					if (!hasImage) return null;

					const imageSrc =
						optionImagePreviews?.[idx] ||
						getImageUrl_(optionImages?.[idx] || "");

					const label = String.fromCharCode(65 + idx);
					const isCorrect =
						type === "mixed_multiple_choice"
							? correctAnswer
									?.split(/[,;|\/]/)
									.map((x) => x.trim())
									.includes(label)
							: correctAnswer === label || correctAnswer === String(idx);

					return (
						<div
							key={idx}
							className={`relative border-2 rounded-lg overflow-hidden ${
								isCorrect
									? "border-green-500 bg-green-50"
									: "border-gray-300 hover:border-gray-400"
							}`}
						>
							<img
								src={imageSrc}
								alt={`Option ${label}`}
								className="w-full h-32 object-contain p-2"
								onError={(e) => {
									console.error(`Image failed to load: ${imageSrc}`);
									(e.target as HTMLImageElement).style.display = "none";
								}}
							/>
							<div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
								{label}
							</div>
							{isCorrect && (
								<div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
									✓
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
