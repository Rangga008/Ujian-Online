export default function Footer() {
	return (
		<footer className="border-t border-gray-200 bg-white mt-auto">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex flex-col md:flex-row justify-between items-center gap-6">
					<div className="text-sm text-gray-600">
						<p className="font-medium text-gray-900 mb-1">Portal Siswa</p>
						<p>© {new Date().getFullYear()} Sistem Ujian Online ANBK Style</p>
					</div>
					<div className="text-sm text-gray-600 text-center md:text-right">
						<p>Versi 1.0</p>
						<p>Semua hak cipta dilindungi</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
