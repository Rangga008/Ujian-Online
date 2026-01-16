import { IsObject, IsOptional } from "class-validator";

export class BulkUpdateSettingsDto {
	@IsObject()
	settings: Record<string, any>;
}
