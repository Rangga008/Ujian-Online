/**
 * Image compression utilities for exam questions
 * Reduces file size before upload while maintaining quality
 */

export interface CompressionResult {
	file: File;
	originalSize: number;
	estimatedSize: number;
	reduction: number; // percentage
}

/**
 * Estimate compression ratio for an image
 * (Frontend estimation before upload)
 */
export function estimateCompressionRatio(file: File): number {
	const type = file.type.toLowerCase();

	if (type.includes("webp")) {
		return 0.25; // ~75% reduction
	}
	if (type.includes("png")) {
		return 0.3; // ~70% reduction
	}
	if (type.includes("jpeg") || type.includes("jpg")) {
		return 0.35; // ~65% reduction
	}

	return 0.5; // conservative estimate for other types
}

/**
 * Compress image using canvas (browser-side)
 * Reduces file size before sending to server
 */
export async function compressImageBrowser(
	file: File,
	maxWidth: number = 1920,
	quality: number = 0.75
): Promise<CompressionResult> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			const img = new Image();

			img.onload = () => {
				// Create canvas and draw resized image
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;

				// Resize if needed
				if (width > maxWidth) {
					height = (height * maxWidth) / width;
					width = maxWidth;
				}

				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Failed to get canvas context"));
					return;
				}

				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error("Failed to compress image"));
							return;
						}

						const compressedFile = new File([blob], file.name, {
							type: file.type,
							lastModified: Date.now(),
						});

						const originalSize = file.size;
						const estimatedSize = blob.size;
						const reduction =
							((originalSize - estimatedSize) / originalSize) * 100;

						resolve({
							file: compressedFile,
							originalSize,
							estimatedSize,
							reduction,
						});
					},
					file.type,
					quality
				);
			};

			img.onerror = () => {
				reject(new Error("Failed to load image"));
			};

			img.src = e.target?.result as string;
		};

		reader.onerror = () => {
			reject(new Error("Failed to read file"));
		};

		reader.readAsDataURL(file);
	});
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
