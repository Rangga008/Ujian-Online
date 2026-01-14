import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import settingsApi from "@/lib/settingsApi";
import { getAssetUrl } from "@/lib/imageUrl";

export default function LoginPage() {
	const router = useRouter();
	const { login, isAuthenticated, logout } = useAuthStore();
	const [nis, setNis] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isReady, setIsReady] = useState(false);

	// Check token validity and listen for storage changes
	useEffect(() => {
		setIsReady(true);

		// Listen for storage changes (token cleared by API interceptor)
		const handleStorageChange = () => {
			const token = localStorage.getItem("student_token");
			if (!token && isAuthenticated) {
				logout();
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [isAuthenticated, logout]);

	// Redirect to dashboard if authenticated and token exists
	useEffect(() => {
		if (!isReady || !router.isReady) return;

		const token = localStorage.getItem("student_token");
		if (isAuthenticated && token) {
			router.push("/dashboard");
		}
	}, [isAuthenticated, router, isReady]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await login(nis, password);
			toast.success("Login berhasil!");
			router.push("/dashboard");
		} catch (error: any) {
			toast.error(error.message || "Login gagal");
		} finally {
			setIsLoading(false);
		}
	};

	const [logoUrl, setLogoUrl] = useState<string | null>(null);

	useEffect(() => {
		const loadSettings = async () => {
			try {
				const settings = await settingsApi.getPublic();
				let settingsObj: Record<string, any> = {};
				if (Array.isArray(settings)) {
					settingsObj = settings.reduce((acc: any, s: any) => {
						acc[s.key] = s.value;
						return acc;
					}, {});
				} else if (settings && typeof settings === "object") {
					settingsObj = settings as Record<string, any>;
				}
				setLogoUrl(settingsObj["app.logo"] || null);
			} catch (err) {
				console.error("Failed to load app settings for login:", err);
			}
		};

		loadSettings();
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
				<div className="text-center mb-6">
					{/** logo from settings if available */}
					{logoUrl ? (
						<img
							src={getAssetUrl(logoUrl)}
							alt="Logo"
							className="mx-auto mb-4 h-16 w-auto"
						/>
					) : (
						<div className="text-4xl mb-2">📝</div>
					)}
					<h1 className="text-2xl font-bold text-gray-900">Portal Siswa</h1>
					<p className="text-gray-600 mt-1">Sistem Ujian Online</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="nis"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							NIS (Nomor Induk Siswa)
						</label>
						<input
							id="nis"
							type="text"
							value={nis}
							onChange={(e) => setNis(e.target.value)}
							className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
							placeholder="12345"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
							placeholder="••••••••"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-medium"
					>
						{isLoading ? "Memproses..." : "Masuk"}
					</button>
				</form>

				<div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-center">
					<p className="font-semibold text-gray-700">Demo Login:</p>
					<p className="text-gray-600">NIS: 12345</p>
					<p className="text-gray-600">Password: siswa123</p>
				</div>
			</div>
		</div>
	);
}
