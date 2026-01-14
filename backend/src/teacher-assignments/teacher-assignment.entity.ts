import {
	Entity,
	PrimaryGeneratedColumn,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	Unique,
} from "typeorm";
import { User } from "../users/user.entity";
import { Class } from "../classes/class.entity";
import { Semester } from "../semesters/semester.entity";

@Entity("teacher_assignments")
@Unique(["teacher", "cls", "semester"])
export class TeacherAssignment {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (u) => (u as any).teacherAssignments, {
		eager: true,
		onDelete: "CASCADE",
	})
	teacher: User;

	@ManyToOne(() => Class, (c) => (c as any).teacherAssignments, { eager: true })
	cls: Class;

	@ManyToOne(() => Semester, (s) => s, { eager: true })
	semester: Semester;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
