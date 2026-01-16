import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	OneToMany,
} from "typeorm";
import { Exam } from "../exams/exam.entity";
import { Answer } from "../submissions/answer.entity";
import { Exclude } from "class-transformer";

export enum QuestionType {
	MULTIPLE_CHOICE = "multiple_choice",
	MIXED_MULTIPLE_CHOICE = "mixed_multiple_choice",
	TRUE_FALSE = "true_false",
	ESSAY = "essay",
	PHOTO_ANSWER = "photo_answer", // New type for photo-based answers
}

@Entity("questions")
export class Question {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	examId: number;

	@ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: "CASCADE" })
	@JoinColumn({ name: "examId" })
	@Exclude()
	exam: Exam;

	@Column({ type: "text" })
	questionText: string;

	@Column({
		type: "enum",
		enum: QuestionType,
		default: QuestionType.MULTIPLE_CHOICE,
	})
	type: QuestionType;

	@Column({ type: "json", nullable: true })
	options: string[]; // For multiple choice questions

	@Column({ type: "json", nullable: true })
	optionImages: string[]; // File paths for option images (A, B, C, D, E)

	@Column({ nullable: true })
	correctAnswer: string;

	@Column({ default: 1 })
	points: number;

	@Column({ nullable: true })
	imageUrl: string; // File path to question image

	@Column({ default: false })
	allowPhotoAnswer?: boolean; // Allow student to submit photo for this question

	@Column({ default: 0 })
	orderIndex: number;

	@OneToMany(() => Answer, (answer) => answer.question)
	answers: Answer[];
}
