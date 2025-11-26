import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Question } from '../questions/question.entity';
import { Submission } from '../submissions/submission.entity';

export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  CLOSED = 'closed',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  duration: number; // in minutes

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  status: ExamStatus;

  @Column({ default: 0 })
  totalQuestions: number;

  @Column({ default: 100 })
  totalScore: number;

  @Column({ default: true })
  randomizeQuestions: boolean;

  @Column({ default: false })
  showResultImmediately: boolean;

  @OneToMany(() => Question, (question) => question.exam, { cascade: true })
  questions: Question[];

  @OneToMany(() => Submission, (submission) => submission.exam)
  submissions: Submission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
