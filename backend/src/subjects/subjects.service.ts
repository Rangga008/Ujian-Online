import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Subject } from "./subject.entity";
import { User, UserRole } from "../users/user.entity";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";

@Injectable()
export class SubjectsService {
	constructor(
		@InjectRepository(Subject)
		private subjectRepository: Repository<Subject>,
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async create(createSubjectDto: CreateSubjectDto): Promise<Subject> {
		const { teacherIds, ...subjectData } = createSubjectDto;

		const subject = this.subjectRepository.create(subjectData);

		if (teacherIds && teacherIds.length > 0) {
			const teachers = await this.userRepository.find({
				where: { id: In(teacherIds), role: UserRole.TEACHER },
			});
			subject.teachers = teachers;
		}

		return await this.subjectRepository.save(subject);
	}

	async findAll(): Promise<Subject[]> {
		return await this.subjectRepository.find({
			relations: ["teachers", "exams", "questionBanks"],
			order: { name: "ASC" },
		});
	}

	async findOne(id: number): Promise<Subject> {
		const subject = await this.subjectRepository.findOne({
			where: { id },
			relations: ["teachers", "exams", "questionBanks"],
		});

		if (!subject) {
			throw new NotFoundException(`Subject with ID ${id} not found`);
		}

		return subject;
	}

	async findByTeacher(teacherId: number): Promise<Subject[]> {
		return await this.subjectRepository
			.createQueryBuilder("subject")
			.leftJoinAndSelect("subject.teachers", "teacher")
			.where("teacher.id = :teacherId", { teacherId })
			.getMany();
	}

	async update(
		id: number,
		updateSubjectDto: UpdateSubjectDto
	): Promise<Subject> {
		const subject = await this.findOne(id);
		const { teacherIds, ...subjectData } =
			updateSubjectDto as UpdateSubjectDto & { teacherIds?: number[] };

		Object.assign(subject, subjectData);

		if (teacherIds !== undefined) {
			if (teacherIds.length > 0) {
				const teachers = await this.userRepository.find({
					where: { id: In(teacherIds), role: UserRole.TEACHER },
				});
				subject.teachers = teachers;
			} else {
				subject.teachers = [];
			}
		}

		return await this.subjectRepository.save(subject);
	}

	async remove(id: number): Promise<void> {
		const subject = await this.findOne(id);
		await this.subjectRepository.remove(subject);
	}

	async assignTeachers(
		subjectId: number,
		teacherIds: number[]
	): Promise<Subject> {
		const subject = await this.findOne(subjectId);

		const teachers = await this.userRepository.find({
			where: { id: In(teacherIds), role: UserRole.TEACHER },
		});

		subject.teachers = teachers;
		return await this.subjectRepository.save(subject);
	}
}
