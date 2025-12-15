/**
 * Helper untuk membangun URL gambar dengan sanitasi yang aman
 * Menghapus /api suffix dari NEXT_PUBLIC_API_URL dan menormalkan path
 *
 * @param path - Path gambar dari backend (contoh: /uploads/file.jpg) atau data URL
 * @returns Full URL gambar yang sudah disanitasi
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
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
	const baseUrl = apiUrl.replace(/\/api\/?$/, "");

	// Pastikan path dimulai dengan /
	const cleanPath = path.startsWith("/") ? path : `/${path}`;

	// Gabungkan dengan base URL
	return `${baseUrl}${cleanPath}`;
}

/**
 * Helper untuk membangun URL asset (logo, favicon, dll)
 * Sama dengan getImageUrl tapi lebih eksplisit untuk asset
 */
export function getAssetUrl(path: string): string {
	return getImageUrl(path);
}
