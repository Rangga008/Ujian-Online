import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from "typeorm";
import { Exam } from "../exams/exam.entity";
import { Answer } from "./answer.entity";
import { Student } from "../students/student.entity";

export enum SubmissionStatus {
	IN_PROGRESS = "in_progress",
	SUBMITTED = "submitted",
	GRADED = "graded",
}

@Entity("submissions")
export class Submission {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	studentId: number;

	@ManyToOne(() => Student, (student) => student.submissions)
	@JoinColumn({ name: "studentId" })
	student: Student;

	@Column()
	examId: number;

	@ManyToOne(() => Exam, (exam) => exam.submissions)
	@JoinColumn({ name: "examId" })
	exam: Exam;

	@Column({
		type: "enum",
		enum: SubmissionStatus,
		default: SubmissionStatus.IN_PROGRESS,
	})
	status: SubmissionStatus;

	@Column({ type: "datetime", nullable: true })
	startedAt: Date;

	@Column({ type: "datetime", nullable: true })
	submittedAt: Date;

	@Column({ type: "float", nullable: true })
	score: number;

	@Column({ default: 0 })
	totalAnswered: number;

	@OneToMany(() => Answer, (answer) => answer.submission, { cascade: true })
	answers: Answer[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
