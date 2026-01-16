import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	ManyToMany,
	JoinTable,
} from "typeorm";
import { Class } from "../classes/class.entity";
import { Subject } from "../subjects/subject.entity";
import { Student } from "../students/student.entity";
import { TeacherAssignment } from "../teacher-assignments/teacher-assignment.entity";

export enum UserRole {
	ADMIN = "admin",
	TEACHER = "teacher",
	STUDENT = "student",
}

@Entity("users")
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true, nullable: true })
	email: string;

	@Column({ unique: true, nullable: true })
	nis: string; // Nomor Induk Siswa (untuk student)

	@Column({ unique: true, nullable: true })
	nip: string; // Nomor Induk Pegawai (untuk guru)

	@Column()
	password: string;

	@Column()
	name: string; // Nama untuk display (bisa nama guru atau nama siswa)

	@Column({
		type: "enum",
		enum: UserRole,
		default: UserRole.STUDENT,
	})
	role: UserRole;

	@Column({ default: true })
	isActive: boolean;

	// Relasi untuk student data per semester
	@OneToMany(() => Student, (student) => student.user)
	students: Student[];

	// Untuk guru
	@ManyToMany(() => Subject, (subject) => subject.teachers)
	@JoinTable({
		name: "teacher_subjects",
		joinColumn: { name: "teacherId", referencedColumnName: "id" },
		inverseJoinColumn: { name: "subjectId", referencedColumnName: "id" },
	})
	subjects: Subject[];

	@ManyToMany(() => Class, (classEntity) => classEntity.teachers)
	teachingClasses: Class[];

	@OneToMany(() => TeacherAssignment, (ta) => ta.teacher)
	teacherAssignments: TeacherAssignment[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
