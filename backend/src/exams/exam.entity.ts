import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { Question } from "../questions/question.entity";
import { Submission } from "../submissions/submission.entity";
import { Semester } from "../semesters/semester.entity";
import { Subject } from "../subjects/subject.entity";
import { Class } from "../classes/class.entity";

export enum ExamStatus {
	DRAFT = "draft",
	PUBLISHED = "published",
	ONGOING = "ongoing",
	CLOSED = "closed",
}

export enum ExamTargetType {
	CLASS = "class",
	GRADE = "grade",
}

@Entity("exams")
export class Exam {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ type: "text" })
	description: string;

	@Column({ nullable: true })
	semesterId: number;

	@ManyToOne(() => Semester, (semester) => semester.exams)
	@JoinColumn({ name: "semesterId" })
	semester: Semester;

	@Column({ nullable: true })
	subjectId: number;

	@ManyToOne(() => Subject, (subject) => subject.exams)
	@JoinColumn({ name: "subjectId" })
	subject: Subject;

	@Column({ nullable: true })
	classId: number; // Target class for this exam

	@ManyToOne(() => Class)
	@JoinColumn({ name: "classId" })
	class: Class;

	@Column({
		type: "enum",
		enum: ExamTargetType,
		default: ExamTargetType.CLASS,
	})
	targetType: ExamTargetType;

	@Column({ nullable: true })
	grade: string; // Grade level (10, 11, 12) when targetType is GRADE

	@Column()
	duration: number; // in minutes

	@Column({ type: "datetime" })
	startTime: Date;

	@Column({ type: "datetime" })
	endTime: Date;

	@Column({
		type: "enum",
		enum: ExamStatus,
		default: ExamStatus.DRAFT,
	})
	status: ExamStatus;

	@Column({ default: 0 })
	totalQuestions: number;

	@Column({ default: 100 })
	totalScore: number;

	@Column({ default: true })
	randomizeQuestions: boolean;

	@Column({ default: false })
	showResultImmediately: boolean;

	@Column({ nullable: true })
	token?: string; // Optional token required to access exam

	@Column({ default: false })
	requireToken: boolean; // Whether token is required for this exam

	@Column({ nullable: true })
	imageUrl?: string;

	@OneToMany(() => Question, (question) => question.exam)
	questions: Question[];

	@OneToMany(() => Submission, (submission) => submission.exam)
	submissions: Submission[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
