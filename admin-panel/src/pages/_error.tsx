import { NextPageContext } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "@/components/Layout";

interface ErrorProps {
	statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
	const getErrorDetails = (code?: number) => {
		switch (code) {
			case 404:
				return {
					title: "404 - Halaman Tidak Ditemukan",
					message: "Maaf, halaman yang Anda cari tidak ada.",
					description:
						"Halaman mungkin telah dihapus atau URL yang Anda masukkan salah.",
					icon: "🔍",
					color: "amber",
				};
			case 500:
				return {
					title: "500 - Kesalahan Server",
					message: "Terjadi kesalahan pada server kami.",
					description:
						"Tim kami sudah diberitahu tentang masalah ini. Silakan coba lagi nanti.",
					icon: "⚙️",
					color: "red",
				};
			case 403:
				return {
					title: "403 - Akses Ditolak",
					message: "Anda tidak memiliki akses ke halaman ini.",
					description:
						"Hubungi administrator jika Anda merasa ini adalah kesalahan.",
					icon: "🚫",
					color: "red",
				};
			case 401:
				return {
					title: "401 - Tidak Terautentikasi",
					message: "Silakan login terlebih dahulu.",
					description: "Anda perlu login untuk mengakses halaman ini.",
					icon: "🔐",
					color: "blue",
				};
			case 400:
				return {
					title: "400 - Permintaan Tidak Valid",
					message: "Permintaan Anda tidak valid.",
					description: "Periksa kembali data yang Anda kirim dan coba lagi.",
					icon: "⚠️",
					color: "orange",
				};
			default:
				return {
					title: "Terjadi Kesalahan",
					message: "Maaf, terjadi kesalahan yang tidak terduga.",
					description: "Silakan coba lagi nanti atau hubungi administrator.",
					icon: "😕",
					color: "gray",
				};
		}
	};

	const error = getErrorDetails(statusCode);

	const colorClasses: Record<
		string,
		{ bg: string; border: string; badge: string }
	> = {
		red: {
			bg: "bg-red-50",
			border: "border-red-200",
			badge: "bg-red-100 text-red-800",
		},
		blue: {
			bg: "bg-blue-50",
			border: "border-blue-200",
			badge: "bg-blue-100 text-blue-800",
		},
		amber: {
			bg: "bg-amber-50",
			border: "border-amber-200",
			badge: "bg-amber-100 text-amber-800",
		},
		orange: {
			bg: "bg-orange-50",
			border: "border-orange-200",
			badge: "bg-orange-100 text-orange-800",
		},
		gray: {
			bg: "bg-gray-50",
			border: "border-gray-200",
			badge: "bg-gray-100 text-gray-800",
		},
	};

	const colors =
		colorClasses[error.color as keyof typeof colorClasses] || colorClasses.gray;

	return (
		<>
			<Head>
				<title>{error.title} - Admin Panel</title>
				<meta name="description" content={error.description} />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>

			<Layout title={error.title}>
				<div className="min-h-screen flex items-center justify-center px-4 py-12">
					<div
						className={`w-full max-w-md ${colors.bg} border ${colors.border} rounded-lg shadow-lg p-8 animate-in fade-in duration-300`}
					>
						{/* Icon */}
						<div className="text-center mb-6">
							<div className="text-6xl mb-4">{error.icon}</div>
						</div>

						{/* Status Code Badge */}
						<div className="text-center mb-6">
							<span
								className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${colors.badge}`}
							>
								{error.title.split(" - ")[0]}
							</span>
						</div>

						{/* Title */}
						<h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
							{error.title.split(" - ")[1]}
						</h1>

						{/* Message */}
						<p className="text-gray-700 text-center mb-3">{error.message}</p>

						{/* Description */}
						<p className="text-gray-600 text-center text-sm mb-8">
							{error.description}
						</p>

						{/* Buttons */}
						<div className="flex gap-4 flex-col sm:flex-row">
							<button
								onClick={() => window.history.back()}
								className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
							>
								← Kembali
							</button>
							<Link
								href="/dashboard"
								className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center"
							>
								Dashboard
							</Link>
						</div>

						{/* Additional Links */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<div className="text-xs text-gray-500 text-center">
								<p className="mb-2">Butuh bantuan?</p>
								<div className="space-y-1">
									<Link
										href="/dashboard"
										className="block text-blue-600 hover:underline text-xs"
									>
										Kembali ke Dashboard
									</Link>
									<a
										href="mailto:admin@example.com"
										className="block text-blue-600 hover:underline text-xs"
									>
										Hubungi Administrator
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Layout>
		</>
	);
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
	const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
	return { statusCode };
};

export default Error;
