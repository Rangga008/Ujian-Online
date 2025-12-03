import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Setting } from "./setting.entity";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";

@Injectable()
export class SettingsService {
	constructor(
		@InjectRepository(Setting)
		private settingRepository: Repository<Setting>
	) {}

	async create(createSettingDto: CreateSettingDto): Promise<Setting> {
		const setting = this.settingRepository.create(createSettingDto);
		return await this.settingRepository.save(setting);
	}

	async findAll(): Promise<Setting[]> {
		return await this.settingRepository.find({
			order: { group: "ASC", key: "ASC" },
		});
	}

	async findPublic(): Promise<Record<string, any>> {
		const settings = await this.settingRepository.find({
			where: { isPublic: true },
		});

		return this.transformToObject(settings);
	}

	async findByGroup(group: string): Promise<Setting[]> {
		return await this.settingRepository.find({
			where: { group },
			order: { key: "ASC" },
		});
	}

	async findOne(id: number): Promise<Setting> {
		const setting = await this.settingRepository.findOne({ where: { id } });

		if (!setting) {
			throw new NotFoundException(`Setting with ID ${id} not found`);
		}

		return setting;
	}

	async findByKey(key: string): Promise<Setting> {
		const setting = await this.settingRepository.findOne({ where: { key } });

		if (!setting) {
			throw new NotFoundException(`Setting with key ${key} not found`);
		}

		return setting;
	}

	async getValue(key: string, defaultValue?: any): Promise<any> {
		try {
			const setting = await this.findByKey(key);
			return this.parseValue(setting.value, setting.type);
		} catch {
			return defaultValue;
		}
	}

	async update(
		id: number,
		updateSettingDto: UpdateSettingDto
	): Promise<Setting> {
		const setting = await this.findOne(id);
		Object.assign(setting, updateSettingDto);
		return await this.settingRepository.save(setting);
	}

	async updateByKey(
		key: string,
		value: any,
		type?: string,
		bypassLock = false
	): Promise<Setting> {
		// Prevent updating dark mode logo if locked (unless bypassed internally)
		if (key === "app.logo_dark" && !bypassLock) {
			const isLocked = await this.getValue("app.logo_dark_locked", true);
			if (isLocked) {
				throw new Error("Dark mode logo is locked and cannot be updated");
			}
		}

		let setting = await this.settingRepository.findOne({ where: { key } });

		if (!setting) {
			// Create if not exists
			setting = this.settingRepository.create({
				key,
				value: this.stringifyValue(value, type),
				type: type || this.detectType(value),
			});
		} else {
			setting.value = this.stringifyValue(value, type || setting.type);
			if (type) setting.type = type;
		}

		return await this.settingRepository.save(setting);
	}

	async bulkUpdate(settings: Record<string, any>): Promise<Setting[]> {
		const results: Setting[] = [];

		for (const [key, value] of Object.entries(settings)) {
			const setting = await this.updateByKey(key, value);
			results.push(setting);
		}

		return results;
	}

	async remove(id: number): Promise<void> {
		const setting = await this.findOne(id);
		await this.settingRepository.remove(setting);
	}

	async removeByKey(key: string): Promise<void> {
		const setting = await this.findByKey(key);
		await this.settingRepository.remove(setting);
	}

	async getAsObject(group?: string): Promise<Record<string, any>> {
		let settings: Setting[];

		if (group) {
			settings = await this.findByGroup(group);
		} else {
			settings = await this.findAll();
		}

		return this.transformToObject(settings);
	}

	private transformToObject(settings: Setting[]): Record<string, any> {
		const result: Record<string, any> = {};

		settings.forEach((setting) => {
			result[setting.key] = this.parseValue(setting.value, setting.type);
		});

		return result;
	}

	private parseValue(value: string, type: string): any {
		if (!value) return null;

		switch (type) {
			case "number":
				return parseFloat(value);
			case "boolean":
				return value === "true" || value === "1";
			case "json":
				try {
					return JSON.parse(value);
				} catch {
					return value;
				}
			default:
				return value;
		}
	}

	private stringifyValue(value: any, type?: string): string {
		if (value === null || value === undefined) return "";

		if (type === "json" || typeof value === "object") {
			return JSON.stringify(value);
		}

		return String(value);
	}

	private detectType(value: any): string {
		if (typeof value === "number") return "number";
		if (typeof value === "boolean") return "boolean";
		if (typeof value === "object") return "json";
		return "text";
	}

	// Initialize default settings
	async initializeDefaults(): Promise<void> {
		const defaults = [
			{
				key: "app.name",
				value: "Sistem Ujian Online",
				type: "text",
				group: "general",
				label: "Nama Aplikasi",
				description: "Nama aplikasi yang ditampilkan di halaman",
				isPublic: true,
			},
			{
				key: "app.short_name",
				value: "SUO",
				type: "text",
				group: "general",
				label: "Nama Singkat",
				description: "Nama singkat aplikasi",
				isPublic: true,
			},
			{
				key: "app.description",
				value: "Platform ujian online untuk sekolah",
				type: "text",
				group: "general",
				label: "Deskripsi",
				description: "Deskripsi aplikasi",
				isPublic: true,
			},
			{
				key: "app.logo",
				value: "/images/logo.png",
				type: "image",
				group: "appearance",
				label: "Logo",
				description: "Logo aplikasi (URL atau path)",
				isPublic: true,
			},
			// Dark mode logo locked (not editable via UI)
			{
				key: "app.logo_dark_locked",
				value: "true",
				type: "boolean",
				group: "appearance",
				label: "Logo Dark Mode Locked",
				description: "Mengunci opsi logo dark mode agar tidak bisa diubah",
				isPublic: false,
			},
			{
				key: "app.favicon",
				value: "/favicon.ico",
				type: "image",
				group: "appearance",
				label: "Favicon",
				description: "Icon yang muncul di browser tab",
				isPublic: true,
			},
			{
				key: "app.primary_color",
				value: "#3B82F6",
				type: "color",
				group: "appearance",
				label: "Warna Utama",
				description: "Warna tema utama aplikasi",
				isPublic: true,
			},
			{
				key: "school.name",
				value: "SMA Negeri 1",
				type: "text",
				group: "school",
				label: "Nama Sekolah",
				description: "Nama sekolah/institusi",
				isPublic: true,
			},
			{
				key: "school.address",
				value: "Jl. Pendidikan No. 1",
				type: "text",
				group: "school",
				label: "Alamat Sekolah",
				description: "Alamat lengkap sekolah",
				isPublic: true,
			},
			{
				key: "school.phone",
				value: "021-12345678",
				type: "text",
				group: "school",
				label: "Telepon",
				description: "Nomor telepon sekolah",
				isPublic: true,
			},
			{
				key: "school.email",
				value: "info@sekolah.sch.id",
				type: "text",
				group: "school",
				label: "Email",
				description: "Email sekolah",
				isPublic: true,
			},
			{
				key: "exam.auto_submit",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Auto Submit",
				description: "Otomatis submit ujian saat waktu habis",
				isPublic: false,
			},
			{
				key: "exam.allow_review",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Review Jawaban",
				description: "Siswa bisa review jawaban sebelum submit",
				isPublic: false,
			},
			{
				key: "exam.show_score",
				value: "true",
				type: "boolean",
				group: "exam",
				label: "Tampilkan Nilai",
				description: "Tampilkan nilai langsung setelah ujian",
				isPublic: false,
			},
		];

		for (const defaultSetting of defaults) {
			const exists = await this.settingRepository.findOne({
				where: { key: defaultSetting.key },
			});

			if (!exists) {
				const setting = this.settingRepository.create(defaultSetting);
				await this.settingRepository.save(setting);
			}
		}
	}
}
