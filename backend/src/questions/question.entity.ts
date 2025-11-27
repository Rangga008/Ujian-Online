import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Exam } from '../exams/exam.entity';
import { Answer } from '../submissions/answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  ESSAY = 'essay',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  examId: number;

  @ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column({ type: 'text' })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column({ type: 'json', nullable: true })
  options: string[]; // For multiple choice questions

  @Column({ nullable: true })
  correctAnswer: string;

  @Column({ default: 1 })
  points: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 0 })
  orderIndex: number;

  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];
}
