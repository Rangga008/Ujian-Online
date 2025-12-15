import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import Head from "next/head";
import settingsApi from "@/lib/settingsApi";
import { getAssetUrl } from "@/lib/imageUrl";

export default function LoginPage({ appSettings }: { appSettings?: any }) {
	const router = useRouter();
	const { login, isAuthenticated } = useAuthStore();
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [method, setMethod] = useState<"email" | "nip">("email");
	const [isLoading, setIsLoading] = useState(false);
	const [localSettings, setLocalSettings] = useState(appSettings);
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);

	useEffect(() => {
		// Fetch public settings for login page if not provided
		const fetchSettings = async () => {
			try {
				const settingsObj = await settingsApi.getPublic();
				// settingsObj is already Record<string, any>, not an array
				setLocalSettings({
					name: settingsObj["app.name"] || "Admin Panel",
					favicon: settingsObj["app.favicon"] || "/favicon.ico",
					logo: settingsObj["app.logo"] || "/images/logo.png",
					description:
						settingsObj["app.description"] ||
						"Sistem Ujian Online - Admin Panel",
				});
			} catch (err) {
				console.error("Failed to fetch public settings for login", err);
			}
		};

		if (!appSettings) {
			fetchSettings();
		}
	}, [appSettings]);

	// Redirect is now handled in _app.tsx to avoid loops

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await login(identifier, password, method);
			toast.success("Login berhasil!");
			router.push("/dashboard");
		} catch (error: any) {
			toast.error(error.message || "Login gagal");
		} finally {
			setIsLoading(false);
		}
	};

	const pageSettings = localSettings ||
		appSettings || {
			name: "Admin Panel",
			description: "Sistem Ujian Online - Admin Panel",
			favicon: "/favicon.ico",
			logo: "/images/logo.png",
		};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-indigo-700 p-6">
			<Head>
				<title>{`${pageSettings.name} - Login`}</title>
				<meta name="description" content={pageSettings.description} />
				<link
					rel="icon"
					href={getAssetUrl(pageSettings.favicon || "/favicon.ico")}
				/>
				<link
					rel="shortcut icon"
					href={getAssetUrl(pageSettings.favicon || "/favicon.ico")}
				/>
				<link
					rel="apple-touch-icon"
					href={getAssetUrl(pageSettings.logo || "/images/logo.png")}
				/>
			</Head>

			<div className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-3xl shadow-xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
				<div className="p-8 lg:p-12">
					<h1 className="text-2xl font-bold text-gray-800 mb-1">
						{pageSettings.name}
					</h1>
					<p className="text-sm text-gray-500 mb-6">
						Masuk untuk mengelola sistem ujian
					</p>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="flex items-center rounded-xl bg-gray-100 p-1 gap-1 w-full max-w-md">
							<button
								type="button"
								onClick={() => setMethod("email")}
								className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
									method === "email" ? "bg-white shadow" : "text-gray-600"
								}`}
							>
								Email
							</button>
							<button
								type="button"
								onClick={() => setMethod("nip")}
								className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
									method === "nip" ? "bg-white shadow" : "text-gray-600"
								}`}
							>
								NIP
							</button>
						</div>

						<div className="max-w-md">
							<label
								htmlFor="identifier"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{method === "email" ? "Email" : "NIP"}
							</label>
							<input
								id="identifier"
								type={method === "email" ? "email" : "text"}
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
								placeholder={
									method === "email" ? "admin@ujian.com" : "NIP guru"
								}
								required
							/>
						</div>

						<div className="max-w-md relative">
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Password
							</label>
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
								placeholder="••••••••"
								required
							/>
							<button
								type="button"
								aria-label="Toggle password visibility"
								onClick={() => setShowPassword((s) => !s)}
								className="absolute right-2 top-9 text-gray-500 hover:text-gray-700"
							>
								{showPassword ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path d="M4.03 6.47A9.97 9.97 0 001.5 10c1.98 3.2 5.39 5 8.5 5 1.1 0 2.15-.2 3.07-.56l-1.06-1.06A6.98 6.98 0 019.5 14C6.27 14 3.86 12.15 2 10c.67-.9 1.54-1.7 2.49-2.36l-.96-.2z" />
									</svg>
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path d="M10 3C5.58 3 2.11 6.11 1 10c1.11 3.89 4.58 7 9 7s7.89-3.11 9-7c-.86-3.03-3.33-5.33-6-6.27L13 3.73C11.99 3.27 11 3 10 3zM10 5c2.76 0 5 2.24 5 5a4.99 4.99 0 01-.92 2.86l-6.94-6.94A4.99 4.99 0 0110 5z" />
									</svg>
								)}
							</button>
						</div>

						<div className="flex items-center justify-between max-w-md">
							<label className="flex items-center gap-2 text-sm text-gray-600">
								<input
									type="checkbox"
									checked={rememberMe}
									onChange={() => setRememberMe((r) => !r)}
									className="h-4 w-4"
								/>
								Ingat saya
							</label>
							<a className="text-sm text-indigo-600 hover:underline" href="#">
								Lupa kata sandi?
							</a>
						</div>

						<div className="max-w-md">
							<button
								type="submit"
								disabled={isLoading}
								className="w-full flex items-center justify-center gap-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-medium transition disabled:opacity-60"
							>
								{isLoading && (
									<svg
										className="animate-spin h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
										></path>
									</svg>
								)}
								<span>{isLoading ? "Memproses..." : "Masuk"}</span>
							</button>
						</div>
					</form>

					<div className="mt-6 text-sm text-gray-500 max-w-md">
						<p className="font-semibold text-gray-700">Demo Login</p>
						<p>Email: admin@ujian.com — Password: admin123</p>
					</div>
				</div>
				<div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white">
					<img
						src={getAssetUrl(
							pageSettings.logo || pageSettings.favicon || "/favicon.ico"
						)}
						alt="logo"
						onError={(e) => {
							const target = e.currentTarget as HTMLImageElement;
							// fallback to favicon if logo missing
							const fallback = getAssetUrl(
								pageSettings.favicon || "/favicon.ico"
							);
							if (target.src !== fallback) {
								target.onerror = null;
								target.src = fallback;
							}
						}}
						className="w-36 h-36 rounded-md mb-6 object-cover"
					/>
					<h2 className="text-3xl font-semibold mb-2">Selamat Datang</h2>
					<p className="text-indigo-100 text-center">
						{pageSettings.description}
					</p>
				</div>
			</div>
		</div>
	);
}
