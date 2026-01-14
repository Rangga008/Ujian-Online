/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	env: {
		NEXT_PUBLIC_API_URL:
			process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
	},
	allowedDevOrigins: ["http://localhost:3002", "http://localhost:3000"],
	// Note: removed deprecated/unsupported dev-only options (webpackDevMiddleware, onDemandEntries)
	// These were causing Next.js to report invalid config keys in newer Next versions.
};

module.exports = nextConfig;
