import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Query,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { SettingsService } from "./settings.service";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { BulkUpdateSettingsDto } from "./dto/bulk-update-settings.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("settings")
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	create(@Body() createSettingDto: CreateSettingDto) {
		return this.settingsService.create(createSettingDto);
	}

	@Get()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	findAll(@Query("group") group?: string) {
		if (group) {
			return this.settingsService.findByGroup(group);
		}
		return this.settingsService.findAll();
	}

	@Get("public")
	findPublic() {
		return this.settingsService.findPublic();
	}

	@Get("object")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	getAsObject(@Query("group") group?: string) {
		return this.settingsService.getAsObject(group);
	}

	@Get("key/:key")
	findByKey(@Param("key") key: string) {
		return this.settingsService.findByKey(key);
	}

	@Get(":id")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	findOne(@Param("id") id: string) {
		return this.settingsService.findOne(+id);
	}

	@Patch("bulk")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	bulkUpdate(@Body() bulkUpdateSettingsDto: BulkUpdateSettingsDto) {
		return this.settingsService.bulkUpdate(bulkUpdateSettingsDto.settings);
	}

	@Patch("key/:key")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	updateByKey(@Param("key") key: string, @Body("value") value: any) {
		return this.settingsService.updateByKey(key, value);
	}

	@Patch(":id")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateSettingDto: UpdateSettingDto) {
		return this.settingsService.update(+id, updateSettingDto);
	}

	@Delete(":id")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.settingsService.remove(+id);
	}

	@Delete("key/:key")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	removeByKey(@Param("key") key: string) {
		return this.settingsService.removeByKey(key);
	}

	@Post("initialize")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	initializeDefaults() {
		return this.settingsService.initializeDefaults();
	}

	// Upload favicon
	@Post("upload/favicon")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	@UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: "public/uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix = Date.now();
					cb(null, `favicon-${uniqueSuffix}${extname(file.originalname)}`);
				},
			}),
			fileFilter: (req, file, cb) => {
				const allowed = [".ico", ".png", ".jpg", ".jpeg", ".svg"];
				const isValid = allowed.includes(
					extname(file.originalname).toLowerCase()
				);
				cb(isValid ? null : new Error("Invalid file type"), isValid);
			},
		})
	)
	async uploadFavicon(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			return { path: null, error: "No file uploaded" };
		}
		const urlPath = `/uploads/${file.filename}`;
		return { path: urlPath };
	}

	// Upload logo
	@Post("upload/logo")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	@UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: "public/uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix = Date.now();
					cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
				},
			}),
			fileFilter: (req, file, cb) => {
				const allowed = [".png", ".jpg", ".jpeg", ".svg"];
				const isValid = allowed.includes(
					extname(file.originalname).toLowerCase()
				);
				cb(isValid ? null : new Error("Invalid file type"), isValid);
			},
		})
	)
	async uploadLogo(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			return { path: null, error: "No file uploaded" };
		}
		const urlPath = `/uploads/${file.filename}`;
		return { path: urlPath };
	}

	// General upload endpoint (for questions, etc) - with image compression
	@Post("upload")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	@UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: "public/uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix = Date.now();
					cb(null, `file-${uniqueSuffix}${extname(file.originalname)}`);
				},
			}),
			fileFilter: (req, file, cb) => {
				const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
				const isValid = allowed.includes(
					extname(file.originalname).toLowerCase()
				);
				cb(isValid ? null : new Error("Invalid file type"), isValid);
			},
		})
	)
	async uploadFile(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			return { path: null, error: "No file uploaded" };
		}

		// Compress image if it's an image file
		const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
		const isImage = imageExtensions.includes(
			extname(file.originalname).toLowerCase()
		);

		if (isImage) {
			try {
				const sharp = require("sharp");
				const fs = require("fs").promises;
				const path = require("path");

				const filePath = path.join("public/uploads", file.filename);

				// Read original size
				const originalSize = (await fs.stat(filePath)).size;

				// Compress based on format
				let compression = sharp(filePath);

				const ext = extname(file.originalname).toLowerCase();
				if (ext === ".png") {
					compression = compression.png({ quality: 80, progressive: true });
				} else if (ext === ".webp") {
					compression = compression.webp({ quality: 75 });
				} else {
					// jpg/jpeg
					compression = compression.jpeg({ quality: 75, progressive: true });
				}

				// Resize if image is too large (max 1920px width)
				compression = compression.resize(1920, 1440, {
					fit: "inside",
					withoutEnlargement: true,
				});

			const tempPath = `${filePath}.tmp`;
			await compression.toFile(tempPath);
			await fs.rename(tempPath, filePath);
				await compression.toFile(tempPath);
				await fs.rename(tempPath, filePath);

				const compressedSize = (await fs.stat(filePath)).size;
				const reduction = (
					((originalSize - compressedSize) / originalSize) *
					100
				).toFixed(1);

				console.log(
					`Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`
				);
			} catch (error) {
				console.error("Image compression failed:", error);
				// Continue anyway, serve original
			}
		}

		const urlPath = `/uploads/${file.filename}`;
		return { path: urlPath };
	}
}
