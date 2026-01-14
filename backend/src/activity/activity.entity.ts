import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";

export enum ActivityType {
	CREATE = "create",
	UPDATE = "update",
	DELETE = "delete",
	OTHER = "other",
}

@Entity("user_activity")
export class Activity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	userId: number;

	@ManyToOne(() => User, { onDelete: "SET NULL" })
	@JoinColumn({ name: "userId" })
	user: User;

	@Column({ type: "enum", enum: ActivityType, default: ActivityType.OTHER })
	type: ActivityType;

	@Column()
	resourceType: string; // e.g., question_bank, exam, class, user

	@Column({ nullable: true })
	resourceId: number;

	@Column({ type: "text", nullable: true })
	action: string; // human readable action

	@Column({ type: "json", nullable: true })
	data: any;

	@CreateDateColumn()
	createdAt: Date;
}
