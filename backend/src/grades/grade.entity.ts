import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  level: number; // 1-12

  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g., "Kelas 1 SD", "Kelas 7 SMP"

  @Column({ type: 'enum', enum: ['SD', 'SMP', 'SMA'] })
  section: 'SD' | 'SMP' | 'SMA';

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
