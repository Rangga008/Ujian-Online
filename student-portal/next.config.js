/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	env: {
		NEXT_PUBLIC_API_URL:
			process.env.NEXT_PUBLIC_API_URL || "localhost:3001",
	},
	allowedDevOrigins: ["localhost:3002"],
};

module.exports = nextConfig;
