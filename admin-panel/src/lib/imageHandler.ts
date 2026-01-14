import { compressImageBrowser, formatFileSize } from "./imageCompression";
import api from "./api";
import toast from "react-hot-toast";

export interface ImageHandleResult {
	url: string;
	originalSize: number;
	compressedSize: number;
	success: boolean;
}

/**
 * Upload single image file to backend
 * @param file - File to upload
 * @param compress - Whether to compress image (default: true)
 * @returns Image URL from server or base64 fallback
 */
export async function uploadImageFile(
	file: File,
	compress: boolean = true
): Promise<ImageHandleResult> {
	if (!file) {
		throw new Error("File is required");
	}

	// Validate file type
	if (!file.type.startsWith("image/")) {
		throw new Error(`Invalid file type: ${file.type}. Expected image/*`);
	}

	// Validate file size (5MB max)
	const MAX_SIZE = 5 * 1024 * 1024;
	if (file.size > MAX_SIZE) {
		throw new Error(
			`File too large: ${formatFileSize(file.size)}. Max: ${formatFileSize(
				MAX_SIZE
			)}`
		);
	}

	let fileToUpload = file;
	let originalSize = file.size;
	let compressedSize = file.size;

	// Compress if enabled
	if (compress) {
		try {
			const result = await compressImageBrowser(file, 1920, 0.75);
			fileToUpload = result.file;
			compressedSize = result.estimatedSize;
		} catch (err) {
			console.warn("Image compression failed, using original:", err);
			// Continue with original file
		}
	}

	// Upload to backend
	try {
		const formData = new FormData();
		formData.append("file", fileToUpload);

		const response = await api.post("/settings/upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		const uploadedUrl = response.data?.path || response.data?.url;
		if (!uploadedUrl) {
			throw new Error("No URL returned from server");
		}

		return {
			url: uploadedUrl,
			originalSize,
			compressedSize,
			success: true,
		};
	} catch (error: any) {
		console.error("Image upload failed:", error);
		throw new Error(
			error.response?.data?.message || error.message || "Failed to upload image"
		);
	}
}

/**
 * Convert base64 data URL to File
 */
export function dataUrlToFile(
	dataUrl: string,
	fileName: string = "image.png"
): File | null {
	try {
		if (!dataUrl || dataUrl === "") return null;

		const arr = dataUrl.split(",");
		if (arr.length < 2) return null;

		const mimeMatch = arr[0].match(/:(.*?);/);
		const mime = mimeMatch ? mimeMatch[1] : "image/png";

		const bstr = atob(arr[1]);
		const n = bstr.length;
		const u8arr = new Uint8Array(n);

		for (let i = 0; i < n; i++) {
			u8arr[i] = bstr.charCodeAt(i);
		}

		return new File([u8arr], fileName, { type: mime });
	} catch (err) {
		console.error("Failed to convert data URL to File:", err);
		return null;
	}
}

/**
 * Upload multiple images (for option images)
 */
export async function uploadOptionImages(
	files: (File | null)[],
	compress: boolean = true
): Promise<string[]> {
	const results: string[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		if (!file) {
			results.push("");
			continue;
		}

		try {
			const result = await uploadImageFile(file, compress);
			results.push(result.url);
			console.log(
				`✅ Option ${i + 1} uploaded:`,
				result.url,
				`(${formatFileSize(result.originalSize)} → ${formatFileSize(
					result.compressedSize
				)})`
			);
		} catch (error: any) {
			console.error(`❌ Option ${i + 1} upload failed:`, error.message);
			results.push("");
		}
	}

	return results;
}

/**
 * Validate option images array
 */
export function validateOptionImages(images: (File | null)[]): boolean {
	const nonNullImages = images.filter((img) => img !== null);
	if (nonNullImages.length === 0) return true; // No images is valid

	for (const img of nonNullImages) {
		if (img && img.size > 5 * 1024 * 1024) {
			throw new Error(`Image too large: ${formatFileSize(img.size)}`);
		}
		if (img && !img.type.startsWith("image/")) {
			throw new Error(`Invalid image type: ${img.type}`);
		}
	}

	return true;
}

/**
 * Get full image URL with domain
 */
export function getFullImageUrl(path: string): string {
	if (!path) return "";

	// If already a full URL, return as is
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	// Otherwise, prepend API base URL
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
	const baseUrl = apiUrl.replace("/api", "");

	// Ensure proper path
	const normalizedPath = path.startsWith("/") ? path : "/" + path;
	return baseUrl + normalizedPath;
}

/**
 * Format image results for logging
 */
export function formatImageUploadResult(result: ImageHandleResult): string {
	return `${result.url} (${formatFileSize(
		result.originalSize
	)} → ${formatFileSize(result.compressedSize)})`;
}
