import { useEffect, useState } from "react";

/**
 * Hook untuk mendeteksi device type dan memberikan anti-cheat features
 * Fitur:
 * - Deteksi mobile vs desktop
 * - Request fullscreen
 * - Prevent screenshot (screen capture)
 * - Detect window focus loss
 * - Disable developer tools
 */
export const useAntiCheat = () => {
	const [isMobile, setIsMobile] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [screenshotAttempts, setScreenshotAttempts] = useState(0);
	const [windowBlurred, setWindowBlurred] = useState(false);
	const [antiCheatActive, setAntiCheatActive] = useState(false);

	// Detect mobile device
	useEffect(() => {
		const checkMobile = () => {
			const userAgent = navigator.userAgent;
			const isMobileDevice =
				/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
					userAgent
				);
			setIsMobile(isMobileDevice);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Request fullscreen
	const requestFullscreen = async () => {
		try {
			const el = document.documentElement as any;
			if (el.requestFullscreen) {
				await el.requestFullscreen();
			} else if (el.webkitRequestFullscreen) {
				await el.webkitRequestFullscreen();
			} else if (el.msRequestFullscreen) {
				await el.msRequestFullscreen();
			}
		} catch (error) {
			console.log("Fullscreen request failed:", error);
		}
	};

	// Exit fullscreen
	const exitFullscreen = async () => {
		try {
			if (document.exitFullscreen) {
				await document.exitFullscreen();
			} else if ((document as any).webkitExitFullscreen) {
				await (document as any).webkitExitFullscreen();
			}
		} catch (error) {
			console.log("Exit fullscreen failed:", error);
		}
	};

	// Activate anti-cheat measures
	const activateAntiCheat = () => {
		setAntiCheatActive(true);

		// Request fullscreen
		requestFullscreen().catch(() => {
			console.log("Could not enter fullscreen");
		});

		// Prevent context menu (right-click)
		const preventContextMenu = (e: Event) => e.preventDefault();

		// Prevent developer tools
		const preventDevTools = (e: KeyboardEvent) => {
			const blockedKeys = [
				"F5",
				"F12",
				"F11",
				"PrintScreen",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			];

			if (blockedKeys.includes(e.key)) {
				e.preventDefault();
			}

			// Ctrl+S, Ctrl+Shift+C, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+K
			if (
				e.ctrlKey &&
				["s", "Shift", "i", "j", "k", "c", "p"].includes(e.key.toLowerCase())
			) {
				e.preventDefault();
			}

			// Cmd+S, Cmd+Option+I
			if (e.metaKey && ["s", "i", "p"].includes(e.key.toLowerCase())) {
				e.preventDefault();
			}
		};

		// Prevent screenshot (hide content on screenshot detection)
		const preventScreenshot = () => {
			(document.body.style as any).webkitUserSelect = "none";
			(document.body.style as any).webkitTouchCallout = "none";

			// Alert on screenshot attempt
			setScreenshotAttempts((prev) => prev + 1);
		};

		// Listen for visibility changes (tab switch, minimize)
		const handleVisibilityChange = () => {
			if (document.hidden) {
				setWindowBlurred(true);
			} else {
				setWindowBlurred(false);
				// Re-request fullscreen when tab is focused
				requestFullscreen().catch(() => {});
			}
		};

		// Listen for fullscreen changes
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
			if (!document.fullscreenElement) {
				requestFullscreen().catch(() => {});
			}
		};

		// Listen for window blur
		const handleBlur = () => {
			setWindowBlurred(true);
		};

		const handleFocus = () => {
			setWindowBlurred(false);
			requestFullscreen().catch(() => {});
		};

		// Prevent volume down (screenshot on some Android devices)
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "VolumeDown" || e.key === "VolumeUp") {
				e.preventDefault();
			}
		};

		// Add event listeners
		document.addEventListener("contextmenu", preventContextMenu);
		document.addEventListener("keydown", preventDevTools);
		window.addEventListener("blur", preventScreenshot);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		window.addEventListener("blur", handleBlur);
		window.addEventListener("focus", handleFocus);
		document.addEventListener("keydown", handleKeyDown);

		// Disable copy-paste
		document.addEventListener("copy", (e) => e.preventDefault());
		document.addEventListener("cut", (e) => e.preventDefault());
		document.addEventListener("paste", (e) => e.preventDefault());

		// Return cleanup function
		return () => {
			document.removeEventListener("contextmenu", preventContextMenu);
			document.removeEventListener("keydown", preventDevTools);
			window.removeEventListener("blur", preventScreenshot);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("focus", handleFocus);
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("copy", (e) => e.preventDefault());
			document.removeEventListener("cut", (e) => e.preventDefault());
			document.removeEventListener("paste", (e) => e.preventDefault());
		};
	};

	return {
		isMobile,
		isFullscreen,
		screenshotAttempts,
		windowBlurred,
		antiCheatActive,
		requestFullscreen,
		exitFullscreen,
		activateAntiCheat,
		setWindowBlurred,
		setIsFullscreen,
	};
};
