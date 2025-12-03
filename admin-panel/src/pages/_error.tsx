import { NextPageContext } from "next";
import Link from "next/link";

interface ErrorProps {
	statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<h1 className="text-9xl font-bold text-primary-600">
					{statusCode || "Error"}
				</h1>
				<h2 className="text-3xl font-semibold text-gray-900 mt-4">
					{statusCode
						? `Terjadi kesalahan ${statusCode}`
						: "Terjadi kesalahan di klien"}
				</h2>
				<p className="text-gray-600 mt-2 mb-8">
					Maaf, terjadi kesalahan. Silakan coba lagi.
				</p>
				<div className="flex gap-4 justify-center">
					<button
						onClick={() => window.history.back()}
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

Error.getInitialProps = ({ res, err }: NextPageContext) => {
	const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
	return { statusCode };
};

export default Error;
