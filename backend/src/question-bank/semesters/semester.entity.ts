import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from "typeorm";
import { Exam } from "../exams/exam.entity";
import { Student } from "../students/student.entity";

export enum SemesterType {
	GANJIL = "ganjil",
	GENAP = "genap",
}

@Entity("semesters")
export class Semester {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string; // Contoh: "Semester 1"

	@Column()
	year: string; // Contoh: "2024/2025"

	@Column({
		type: "enum",
		enum: SemesterType,
	})
	type: SemesterType;

	@Column({ type: "date" })
	startDate?: Date;

	@Column({ type: "date" })
	endDate?: Date;
	@Column({ type: "text", nullable: true })
	description?: string;

	@Column({ default: false })
	isActive: boolean; // Hanya 1 semester yang bisa active

	@OneToMany(() => Exam, (exam) => exam.semester)
	exams: Exam[];

	@OneToMany(() => Student, (student) => student.semester)
	students: Student[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
