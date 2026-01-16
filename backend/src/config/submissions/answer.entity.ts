import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { Submission } from "./submission.entity";
import { Question } from "../questions/question.entity";

@Entity("answers")
export class Answer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	submissionId: number;

	@ManyToOne(() => Submission, (submission) => submission.answers, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "submissionId" })
	submission: Submission;

	@Column()
	questionId: number;

	@ManyToOne(() => Question, (question) => question.answers, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "questionId" })
	question: Question;

	@Column({ type: "text", nullable: true })
	answer: string;

	@Column({ type: "text", nullable: true })
	answerImageUrl?: string; // URL for answer submitted as image/photo

	@Column({ default: false })
	isCorrect: boolean;

	@Column({ type: "float", default: 0 })
	points: number;
}
