import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './submission.entity';
import { Answer } from './answer.entity';
import { CreateSubmissionDto, SubmitAnswerDto } from './dto/submission.dto';
import { QuestionsService } from '../questions/questions.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Answer)
    private answersRepository: Repository<Answer>,
    private questionsService: QuestionsService,
  ) {}

  async startExam(userId: number, examId: number): Promise<Submission> {
    // Check if already has submission
    const existing = await this.submissionsRepository.findOne({
      where: { userId, examId, status: SubmissionStatus.IN_PROGRESS },
    });

    if (existing) {
      return existing;
    }

    const submission = this.submissionsRepository.create({
      userId,
      examId,
      status: SubmissionStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return this.submissionsRepository.save(submission);
  }

  async submitAnswer(
    submissionId: number,
    submitAnswerDto: SubmitAnswerDto,
  ): Promise<Answer> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new BadRequestException('Submission is not in progress');
    }

    const question = await this.questionsService.findOne(submitAnswerDto.questionId);

    // Check if answer already exists
    let answer = await this.answersRepository.findOne({
      where: {
        submissionId,
        questionId: submitAnswerDto.questionId,
      },
    });

    const isCorrect = question.correctAnswer === submitAnswerDto.answer;
    const points = isCorrect ? question.points : 0;

    if (answer) {
      answer.answer = submitAnswerDto.answer;
      answer.isCorrect = isCorrect;
      answer.points = points;
    } else {
      answer = this.answersRepository.create({
        submissionId,
        questionId: submitAnswerDto.questionId,
        answer: submitAnswerDto.answer,
        isCorrect,
        points,
      });
    }

    return this.answersRepository.save(answer);
  }

  async submitExam(submissionId: number, userId: number): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId, userId },
      relations: ['answers'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new BadRequestException('Submission is not in progress');
    }

    const totalScore = submission.answers.reduce((sum, answer) => sum + answer.points, 0);

    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();
    submission.score = totalScore;
    submission.totalAnswered = submission.answers.length;

    return this.submissionsRepository.save(submission);
  }

  async findByUser(userId: number): Promise<Submission[]> {
    return this.submissionsRepository.find({
      where: { userId },
      relations: ['exam'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByExam(examId: number): Promise<Submission[]> {
    return this.submissionsRepository.find({
      where: { examId },
      relations: ['user', 'answers'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id },
      relations: ['user', 'exam', 'answers', 'answers.question'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }
}
