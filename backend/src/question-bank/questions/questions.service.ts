import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './question.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
    const question = this.questionsRepository.create(createQuestionDto);
    return this.questionsRepository.save(question);
  }

  async findByExam(examId: number): Promise<Question[]> {
    return this.questionsRepository.find({
      where: { examId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Question> {
    const question = await this.questionsRepository.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findOne(id);
    Object.assign(question, updateQuestionDto);
    return this.questionsRepository.save(question);
  }

  async remove(id: number): Promise<void> {
    const question = await this.findOne(id);
    await this.questionsRepository.remove(question);
  }

  async bulkCreate(examId: number, questions: CreateQuestionDto[]): Promise<Question[]> {
    const questionEntities = questions.map((q, index) => 
      this.questionsRepository.create({ ...q, examId, orderIndex: index })
    );
    return this.questionsRepository.save(questionEntities);
  }
}
