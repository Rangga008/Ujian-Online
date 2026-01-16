import {
	Controller,
	Post,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuid } from "uuid";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const uploadDir = join(process.cwd(), "public", "uploads", "questions");

// Ensure upload directory exists
if (!existsSync(uploadDir)) {
	mkdirSync(uploadDir, { recursive: true });
}

@Controller("api/upload")
export class UploadController {
	@Post("image")
	@UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: (req, file, cb) => {
					if (!existsSync(uploadDir)) {
						mkdirSync(uploadDir, { recursive: true });
					}
					cb(null, uploadDir);
				},
				filename: (req, file, cb) => {
					const randomName = uuid();
					const ext = extname(file.originalname);
					cb(null, `${randomName}${ext}`);
				},
			}),
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
					return cb(
						new BadRequestException("Only image files are allowed!"),
						false
					);
				}
				cb(null, true);
			},
			limits: {
				fileSize: 5 * 1024 * 1024, // 5MB
			},
		})
	)
	uploadImage(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			throw new BadRequestException("No file uploaded");
		}

		// Return relative path that can be served by static files
		const filePath = `/uploads/questions/${file.filename}`;
		return {
			success: true,
			path: filePath,
			filename: file.filename,
			url: filePath,
		};
	}
}
