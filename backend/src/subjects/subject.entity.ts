import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	ManyToMany,
} from "typeorm";
import { User } from "../users/user.entity";
import { Exam } from "../exams/exam.entity";

@Entity("subjects")
export class Subject {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string; // Matematika, Bahasa Indonesia, dll

	@Column()
	code: string; // MAT, BIN, dll

	@Column({ type: "text", nullable: true })
	description: string;

	@Column({ nullable: true })
	color: string; // Untuk UI

	@Column({ default: true })
	isActive: boolean;

	@OneToMany(() => Exam, (exam) => exam.subject)
	exams: Exam[];

	@ManyToMany(() => User, (user) => user.subjects)
	teachers: User[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
