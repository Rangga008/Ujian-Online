import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam, ExamStatus } from './exam.entity';
import { CreateExamDto, UpdateExamDto } from './dto/exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examsRepository: Repository<Exam>,
  ) {}

  async create(createExamDto: CreateExamDto): Promise<Exam> {
    const exam = this.examsRepository.create(createExamDto);
    return this.examsRepository.save(exam);
  }

  async findAll(status?: ExamStatus): Promise<Exam[]> {
    const where = status ? { status } : {};
    return this.examsRepository.find({
      where,
      relations: ['questions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Exam> {
    const exam = await this.examsRepository.findOne({
      where: { id },
      relations: ['questions'],
    });
    
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    
    return exam;
  }

  async findActiveExams(): Promise<Exam[]> {
    const now = new Date();
    return this.examsRepository
      .createQueryBuilder('exam')
      .where('exam.status = :status', { status: ExamStatus.PUBLISHED })
      .andWhere('exam.startTime <= :now', { now })
      .andWhere('exam.endTime >= :now', { now })
      .leftJoinAndSelect('exam.questions', 'questions')
      .orderBy('exam.startTime', 'ASC')
      .getMany();
  }

  async update(id: number, updateExamDto: UpdateExamDto): Promise<Exam> {
    const exam = await this.findOne(id);
    Object.assign(exam, updateExamDto);
    return this.examsRepository.save(exam);
  }

  async remove(id: number): Promise<void> {
    const exam = await this.findOne(id);
    await this.examsRepository.remove(exam);
  }

  async updateStatus(id: number, status: ExamStatus): Promise<Exam> {
    const exam = await this.findOne(id);
    exam.status = status;
    return this.examsRepository.save(exam);
  }
}
