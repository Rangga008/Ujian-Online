import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Exam } from '../exams/exam.entity';
import { Answer } from './answer.entity';

export enum SubmissionStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  examId: number;

  @ManyToOne(() => Exam, (exam) => exam.submissions)
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.IN_PROGRESS,
  })
  status: SubmissionStatus;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ default: 0 })
  totalAnswered: number;

  @OneToMany(() => Answer, (answer) => answer.submission, { cascade: true })
  answers: Answer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
