import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import Head from "next/head";
import settingsApi from "@/lib/settingsApi";
import { getAssetUrl } from "@/lib/imageUrl";
import { SidebarProvider } from "@/context/SidebarContext";

export default function App({ Component, pageProps }: AppProps) {
	const [appSettings, setAppSettings] = useState<{
		name: string;
		favicon: string;
		logo: string;
		description: string;
	}>({
		name: "Portal Siswa",
		favicon: "/favicon.ico",
		logo: "/images/logo.png",
		description: "Sistem Ujian Online - Portal Siswa",
	});

	useEffect(() => {
		// Fetch public settings
		const fetchAppSettings = async () => {
			try {
				const settings = await settingsApi.getPublic();
				let settingsObj: Record<string, any> = {};
				if (Array.isArray(settings)) {
					settingsObj = settings.reduce((acc: any, s: any) => {
						acc[s.key] = s.value;
						return acc;
					}, {});
				} else if (settings && typeof settings === "object") {
					// Backend may return an object map for public settings
					settingsObj = settings as Record<string, any>;
				} else {
					console.warn(
						"settingsApi.getPublic() returned unexpected value:",
						settings
					);
				}

				setAppSettings({
					name: settingsObj["app.name"] || "Portal Siswa",
					favicon: settingsObj["app.favicon"] || "/favicon.ico",
					logo: settingsObj["app.logo"] || "/images/logo.png",
					description:
						settingsObj["app.description"] ||
						"Sistem Ujian Online - Portal Siswa",
				});
			} catch (error) {
				console.error("Failed to fetch app settings:", error);
			}
		};

		fetchAppSettings();
	}, []);

	return (
		<SidebarProvider>
			<Head>
				<title>{`${appSettings.name} - Portal Siswa`}</title>
				<meta name="description" content={appSettings.description} />
				<link
					rel="icon"
					href={getAssetUrl(appSettings.favicon || "/favicon.ico")}
				/>
				<link
					rel="shortcut icon"
					href={getAssetUrl(appSettings.favicon || "/favicon.ico")}
				/>
				<link
					rel="apple-touch-icon"
					href={getAssetUrl(appSettings.logo || "/images/logo.png")}
				/>
				<meta property="og:description" content={appSettings.description} />
				<meta
					property="og:image"
					content={getAssetUrl(appSettings.logo || "/images/logo.png")}
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>
			<Component {...pageProps} />
			<Toaster position="top-right" />
		</SidebarProvider>
	);
}
