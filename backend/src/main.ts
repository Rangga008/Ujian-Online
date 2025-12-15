import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const configService = app.get(ConfigService);

	// Enable CORS for frontend applications
	app.enableCors({
		origin: [
			"https://admin.cybersmkn2bandung.my.id",
			"https://student.cybersmkn2bandung.my.id",
			"https://cybersmkn2bandung.my.id",
			"http://localhost:3000",
			"http://localhost:3001",
		],
		methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
		exposedHeaders: ["Content-Length", "X-JSON-Response"],
		credentials: true,
		optionsSuccessStatus: 200,
		preflightContinue: false,
		maxAge: 86400,
	});

	// Serve static files from /public/uploads at /uploads/*
	app.useStaticAssets(join(__dirname, "..", "public", "uploads"), {
		prefix: "/uploads/",
	});

	// Enable validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		})
	);

	// API prefix
	app.setGlobalPrefix("api");

	const port = configService.get("API_PORT", 3001);
	await app.listen(port);

	console.log(`🚀 Backend API running on: http://localhost:${port}/api`);
}
bootstrap();
