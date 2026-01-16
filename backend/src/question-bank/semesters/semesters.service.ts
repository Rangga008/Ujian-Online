import {
	Injectable,
	NotFoundException,
	ConflictException,
	Inject,
	forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Semester } from "./semester.entity";
import { CreateSemesterDto } from "./dto/create-semester.dto";
import { UpdateSemesterDto } from "./dto/update-semester.dto";
import { StudentsService } from "../students/students.service";
import { Exam } from "../exams/exam.entity";
import { Submission } from "../submissions/submission.entity";
import { Class } from "../classes/class.entity";

@Injectable()
export class SemestersService {
	constructor(
		@InjectRepository(Semester)
		private semesterRepository: Repository<Semester>,
		@InjectRepository(Exam)
		private examRepository: Repository<Exam>,
		@InjectRepository(Submission)
		private submissionRepository: Repository<Submission>,
		@InjectRepository(Class)
		private classRepository: Repository<Class>,
		@Inject(forwardRef(() => StudentsService))
		private studentsService: StudentsService
	) {}

	async create(createSemesterDto: CreateSemesterDto): Promise<Semester> {
		// If this semester is being set as active, deactivate all others
		if (createSemesterDto.isActive) {
			await this.semesterRepository.update(
				{ isActive: true },
				{ isActive: false }
			);
		}

		const semester = this.semesterRepository.create(createSemesterDto);
		return await this.semesterRepository.save(semester);
	}

	async findAll(): Promise<Semester[]> {
		return await this.semesterRepository.find({
			order: { year: "DESC", type: "ASC" },
			relations: ["exams"],
		});
	}

	async findOne(id: number): Promise<Semester> {
		const semester = await this.semesterRepository.findOne({
			where: { id },
			relations: ["exams"],
		});

		if (!semester) {
			throw new NotFoundException(`Semester with ID ${id} not found`);
		}

		return semester;
	}

	async findActive(): Promise<Semester> {
		const semester = await this.semesterRepository.findOne({
			where: { isActive: true },
			relations: ["exams"],
		});

		// Jika tidak ada semester aktif, jangan lempar error; kembalikan null
		return semester || null;
	}

	async update(
		id: number,
		updateSemesterDto: UpdateSemesterDto
	): Promise<Semester> {
		const semester = await this.findOne(id);

		// If setting this semester as active, deactivate all others
		const dto = updateSemesterDto as any;
		if (dto.isActive) {
			await this.semesterRepository.update(
				{ isActive: true },
				{ isActive: false }
			);
		}

		Object.assign(semester, updateSemesterDto);
		const result = await this.semesterRepository.save(semester);

		// Sync student active status if semester activation changed
		if (dto.isActive !== undefined) {
			await this.studentsService.syncStudentActiveStatus();
		}

		return result;
	}

	async setActive(id: number): Promise<Semester> {
		const semester = await this.findOne(id);

		// Deactivate all other semesters
		await this.semesterRepository.update(
			{ isActive: true },
			{ isActive: false }
		);

		semester.isActive = true;
		const result = await this.semesterRepository.save(semester);

		// Sync student active status after semester change
		await this.studentsService.syncStudentActiveStatus();

		return result;
	}

	async remove(id: number): Promise<void> {
		const semester = await this.semesterRepository.findOne({
			where: { id },
			relations: ["exams", "students"],
		});

		if (!semester) {
			throw new NotFoundException(`Semester with ID ${id} not found`);
		}

		if (semester.isActive) {
			throw new ConflictException("Cannot delete the active semester");
		}

		// Check for exams in this semester
		const examsCount = await this.examRepository.count({
			where: { semesterId: id },
		});

		if (examsCount > 0) {
			// Check if any exam has submissions
			const submissionsCount = await this.submissionRepository
				.createQueryBuilder("submission")
				.innerJoin("submission.exam", "exam")
				.where("exam.semesterId = :semesterId", { semesterId: id })
				.getCount();

			if (submissionsCount > 0) {
				throw new ConflictException(
					`Cannot delete semester with ${submissionsCount} active exam submission(s). Please delete or close related exams first.`
				);
			}

			throw new ConflictException(
				`Cannot delete semester with ${examsCount} exam(s). Please delete related exams first.`
			);
		}

		// Check if semester has students
		if (semester.students && semester.students.length > 0) {
			throw new ConflictException(
				`Cannot delete semester with ${semester.students.length} student record(s). Please reassign students to another semester first.`
			);
		}

		// Clear semesterId from classes that reference this semester
		await this.classRepository.update({ semesterId: id }, { semesterId: null });

		await this.semesterRepository.remove(semester);
	}
}
