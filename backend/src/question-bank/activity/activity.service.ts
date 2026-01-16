import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Activity, ActivityType } from "./activity.entity";

@Injectable()
export class ActivityService {
	constructor(
		@InjectRepository(Activity)
		private activityRepository: Repository<Activity>
	) {}

	async log(
		userId: number,
		type: ActivityType,
		resourceType: string,
		resourceId: number | null,
		action: string,
		data?: any
	) {
		try {
			const act = this.activityRepository.create({
				userId,
				type,
				resourceType,
				resourceId: resourceId || null,
				action,
				data: data || null,
			});
			return await this.activityRepository.save(act);
		} catch (err) {
			// Do not block main flow if logging fails
			console.warn("⚠️ Activity logging failed (non-blocking):", err.message);
			return null;
		}
	}

	async findByUser(userId: number, limit = 20) {
		return this.activityRepository.find({
			where: { userId },
			order: { createdAt: "DESC" },
			take: limit,
		});
	}
}
