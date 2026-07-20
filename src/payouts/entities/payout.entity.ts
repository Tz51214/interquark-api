import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  freelancer: User;

  @ManyToOne(() => Project, { nullable: true, eager: true, onDelete: 'SET NULL' })
  project: Project | null;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
