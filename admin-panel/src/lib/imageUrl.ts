/**
 * Helper untuk membangun URL gambar dengan sanitasi yang aman
 * Menghapus /api suffix dari NEXT_PUBLIC_API_URL dan menormalkan path
 * Mendukung local data URLs untuk preview sebelum upload
 *
 * @param path - Path gambar dari backend (contoh: /uploads/file.jpg), data URL, atau full URL
 * @returns Full URL gambar yang sudah disanitasi atau data URL jika digunakan untuk preview
 */
export function getImageUrl(path: string): string {
	if (!path) return "";

	// Jika sudah full URL atau data URL, return langsung
	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:")
	) {
		return path;
	}

	// Ambil base URL dan hapus /api suffix jika ada
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
	const baseUrl = apiUrl.replace(/\/api\/?$/, "");

	// Pastikan path dimulai dengan /
	const cleanPath = path.startsWith("/") ? path : `/${path}`;

	// Gabungkan dengan base URL
	return `${baseUrl}${cleanPath}`;
}

/**
 * Validate image URL is accessible
 * Useful for checking if uploaded image is valid before saving to DB
 */
export async function validateImageUrl(url: string): Promise<boolean> {
	if (!url || url.startsWith("data:")) {
		return true; // Data URLs don't need validation
	}

	try {
		const response = await fetch(url, { method: "HEAD" });
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Helper untuk membangun URL asset (logo, favicon, dll)
 * Sama dengan getImageUrl tapi lebih eksplisit untuk asset
 */
export function getAssetUrl(path: string): string {
	return getImageUrl(path);
}
