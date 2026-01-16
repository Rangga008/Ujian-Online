import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("settings")
export class Setting {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	key: string;

	@Column({ type: "text", nullable: true })
	value: string;

	@Column({ nullable: true })
	type: string; // text, number, boolean, image, color, json

	@Column({ nullable: true })
	group: string; // general, appearance, email, etc

	@Column({ nullable: true })
	label: string;

	@Column({ type: "text", nullable: true })
	description: string;

	@Column({ default: true })
	isPublic: boolean; // Apakah setting ini bisa diakses tanpa auth

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
