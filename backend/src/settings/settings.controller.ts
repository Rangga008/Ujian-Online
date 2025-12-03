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
		const urlPath = `/uploads/${file.filename}`;
		await this.settingsService.updateByKey("app.favicon", urlPath, "image");
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
		const urlPath = `/uploads/${file.filename}`;
		await this.settingsService.updateByKey("app.logo", urlPath, "image");

		// Auto-generate dark mode logo with -dark suffix (bypass lock)
		const darkLogoPath = urlPath.replace(/(\.[^.]+)$/, "-dark$1");
		await this.settingsService.updateByKey(
			"app.logo_dark",
			darkLogoPath,
			"image",
			true // bypass lock
		);

		return { path: urlPath, darkPath: darkLogoPath };
	}
}
