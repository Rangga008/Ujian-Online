import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	ManyToMany,
	JoinTable,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Semester } from "../semesters/semester.entity";
import { Student } from "../students/student.entity";
import { Subject } from "../subjects/subject.entity";

@Entity("classes")
export class Class {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string; // 12 IPA 1, 11 IPS 2, dll

	@Column()
	grade: number; // 10, 11, 12

	@Column({ nullable: true })
	gradeId: number; // Reference ke Grade table (angkatan)

	@Column()
	major: string; // IPA, IPS, Bahasa

	@Column()
	academicYear: number; // 2025

	@Column({ nullable: true })
	semesterId: number; // Relasi ke semester aktif saat kelas dibuat

	@ManyToOne(() => Semester, (semester) => semester.exams, { nullable: true })
	@JoinColumn({ name: "semesterId" })
	semester: Semester;

	@Column({ default: 0 })
	capacity: number; // Max students

	@Column({ default: true })
	isActive: boolean;

	@OneToMany(() => Student, (student) => student.class)
	students: Student[];

	@ManyToMany(() => User, (user) => user.teachingClasses)
	@JoinTable({
		name: "class_teachers",
		joinColumn: { name: "classId", referencedColumnName: "id" },
		inverseJoinColumn: { name: "teacherId", referencedColumnName: "id" },
	})
	teachers: User[];

	@ManyToMany(() => Subject, (subject) => subject.classes)
	@JoinTable({
		name: "class_subjects",
		joinColumn: { name: "classId", referencedColumnName: "id" },
		inverseJoinColumn: { name: "subjectId", referencedColumnName: "id" },
	})
	subjects: Subject[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
