import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuthStore } from "@/store/authStore";
import settingsApi from "@/lib/settingsApi";
import { getImageUrl } from "@/lib/imageUrl";

export default function App({ Component, pageProps }: AppProps) {
	const router = useRouter();
	const { checkAuth, isAuthenticated } = useAuthStore();
	const [isHydrated, setIsHydrated] = useState(false);
	const [faviconVersion, setFaviconVersion] = useState(0);
	const [appSettings, setAppSettings] = useState<{
		name: string;
		favicon: string;
		logo: string;
		description: string;
	}>({
		name: "Admin Panel",
		favicon: "/favicon.ico",
		logo: "/images/logo.png",
		description: "Sistem Ujian Online - Admin Panel",
	});

	useEffect(() => {
		checkAuth();
		setIsHydrated(true);

		// Fetch public settings
		const fetchAppSettings = async () => {
			try {
				const settingsObj = await settingsApi.getPublic();
				// settingsObj is already Record<string, any>, not an array

				setAppSettings({
					name: settingsObj["app.name"] || "Admin Panel",
					favicon: settingsObj["app.favicon"] || "/favicon.ico",
					logo: settingsObj["app.logo"] || "/images/logo.png",
					description:
						settingsObj["app.description"] ||
						"Sistem Ujian Online - Admin Panel",
				});
			} catch (error) {
				console.error("Failed to fetch app settings:", error);
			}
		};

		fetchAppSettings();
	}, [checkAuth]);

	// Force update favicon on the client when settings change (covers public routes like login)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const favicon = appSettings.favicon;
		if (!favicon) return;
		setFaviconVersion(Date.now());
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
		if (link) {
			link.href = `${getImageUrl(favicon)}?v=${Date.now()}`;
		}
	}, [appSettings.favicon]);

	// Protected routes
	const publicRoutes = ["/login", "/404", "/500", "/_error"];
	const isPublicRoute = publicRoutes.includes(router.pathname);

	// Wait for hydration before rendering protected routes
	if (!isHydrated) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-xl">Loading...</div>
			</div>
		);
	}

	// Redirect to login if not authenticated and trying to access protected route
	if (!isAuthenticated && !isPublicRoute) {
		if (typeof window !== "undefined") {
			router.replace("/login");
		}
		return null;
	}

	return (
		<>
			<Head>
				<meta name="description" content={appSettings.description} />
				<link
					rel="icon"
					href={`${getImageUrl(appSettings.favicon)}?v=${faviconVersion}`}
					key={`favicon-${faviconVersion}`}
				/>
				<link
					rel="shortcut icon"
					href={`${getImageUrl(appSettings.favicon)}?v=${faviconVersion}`}
					key={`shortcut-icon-${faviconVersion}`}
				/>
				<link
					rel="apple-touch-icon"
					href={`${getImageUrl(appSettings.logo)}?v=${faviconVersion}`}
					key={`apple-icon-${faviconVersion}`}
				/>
				<meta property="og:description" content={appSettings.description} />
				<meta property="og:image" content={getImageUrl(appSettings.logo)} />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>
			<Component {...pageProps} appSettings={appSettings} />
			<Toaster position="top-right" />
		</>
	);
}
