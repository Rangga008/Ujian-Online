export default function Footer() {
	return (
		<footer className="mt-12 border-t bg-white">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-600">
				© {new Date().getFullYear()} Portal Siswa — Sistem Ujian Online
			</div>
		</footer>
	);
}
