import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	OneToMany,
} from "typeorm";
import { User } from "../users/user.entity";
import { Class } from "../classes/class.entity";
import { Semester } from "../semesters/semester.entity";
import { Submission } from "../submissions/submission.entity";

export enum Gender {
	MALE = "male",
	FEMALE = "female",
}

@Entity("students")
export class Student {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	userId: number; // Relasi ke User (akun login)

	@ManyToOne(() => User, (user) => user.students, { onDelete: "CASCADE" })
	@JoinColumn({ name: "userId" })
	user: User;

	@Column()
	semesterId: number; // Semester dimana data siswa ini aktif

	@ManyToOne(() => Semester, (semester) => semester.students)
	@JoinColumn({ name: "semesterId" })
	semester: Semester;

	@Column()
	name: string; // Nama siswa

	@Column({ nullable: true })
	classId: number;

	@ManyToOne(() => Class, (classEntity) => classEntity.students)
	@JoinColumn({ name: "classId" })
	class: Class;

	@Column({
		type: "enum",
		enum: Gender,
		nullable: true,
	})
	gender: Gender;

	@Column({ type: "date", nullable: true })
	dateOfBirth: Date;

	@Column({ nullable: true })
	phone: string;

	@Column({ type: "text", nullable: true })
	address: string;

	@Column({ nullable: true })
	parentName: string;

	@Column({ nullable: true })
	parentPhone: string;

	@Column({ nullable: true })
	photoUrl: string;

	@Column({ default: true })
	isActive: boolean; // Status aktif di semester ini

	@OneToMany(() => Submission, (submission) => submission.student)
	submissions: Submission[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
