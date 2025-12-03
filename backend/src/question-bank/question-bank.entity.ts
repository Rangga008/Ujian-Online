import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	ManyToMany,
	JoinTable,
} from "typeorm";
import { Subject } from "../subjects/subject.entity";
import { User } from "../users/user.entity";

export enum DifficultyLevel {
	EASY = "easy",
	MEDIUM = "medium",
	HARD = "hard",
}

export enum QuestionType {
	MULTIPLE_CHOICE = "multiple_choice",
	TRUE_FALSE = "true_false",
	ESSAY = "essay",
	MULTIPLE_RESPONSE = "multiple_response", // Jawaban lebih dari 1
}

@Entity("question_bank")
export class QuestionBank {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	subjectId: number;

	@ManyToOne(() => Subject)
	@JoinColumn({ name: "subjectId" })
	subject: Subject;

	@Column({ type: "text" })
	questionText: string;

	@Column({
		type: "enum",
		enum: QuestionType,
		default: QuestionType.MULTIPLE_CHOICE,
	})
	type: QuestionType;

	@Column({ type: "json", nullable: true })
	options: string[];

	@Column({ type: "json", nullable: true })
	correctAnswers: string[]; // Array untuk multiple response

	@Column({ nullable: true })
	explanation: string; // Pembahasan soal

	@Column({
		type: "enum",
		enum: DifficultyLevel,
		default: DifficultyLevel.MEDIUM,
	})
	difficulty: DifficultyLevel;

	@Column({ default: 1 })
	points: number;

	@Column({ nullable: true })
	imageUrl: string;

	@Column({ type: "simple-array", nullable: true })
	tags: string[]; // Tag untuk categorize soal

	@Column({ nullable: true })
	createdById: number;

	@ManyToOne(() => User)
	@JoinColumn({ name: "createdById" })
	createdBy: User;

	@Column({ default: 0 })
	usageCount: number; // Berapa kali soal dipakai

	@Column({ default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
