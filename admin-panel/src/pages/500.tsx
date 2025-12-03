import Link from "next/link";
import { useRouter } from "next/router";

export default function Custom500() {
	const router = useRouter();

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<h1 className="text-9xl font-bold text-red-600">500</h1>
				<h2 className="text-3xl font-semibold text-gray-900 mt-4">
					Terjadi Kesalahan Server
				</h2>
				<p className="text-gray-600 mt-2 mb-8">
					Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti.
				</p>
				<div className="flex gap-4 justify-center">
					<button
						onClick={() => router.back()}
						className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
					>
						← Kembali
					</button>
					<Link
						href="/dashboard"
						className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
					>
						🏠 Ke Dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}
