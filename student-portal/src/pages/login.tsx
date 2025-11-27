import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
	const router = useRouter();
	const { login, isAuthenticated } = useAuthStore();
	const [nis, setNis] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (isAuthenticated) {
			router.push("/dashboard");
		}
	}, [isAuthenticated, router]);

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

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
			<div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
				<div className="text-center mb-8">
					<div className="text-5xl mb-4">📝</div>
					<h1 className="text-3xl font-bold text-gray-900">Portal Siswa</h1>
					<p className="text-gray-600 mt-2">Sistem Ujian Online</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label
							htmlFor="nis"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							NIS (Nomor Induk Siswa)
						</label>
						<input
							id="nis"
							type="text"
							value={nis}
							onChange={(e) => setNis(e.target.value)}
							className="input"
							placeholder="12345"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="input"
							placeholder="••••••••"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full btn btn-primary py-3 text-lg"
					>
						{isLoading ? "Loading..." : "Login"}
					</button>
				</form>

				<div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
					<p className="font-semibold text-blue-900">Demo Login:</p>
					<p className="text-blue-700">NIS: 12345</p>
					<p className="text-blue-700">Password: siswa123</p>
				</div>
			</div>
		</div>
	);
}
