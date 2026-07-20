import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
}

// Extends a freelancer's User record with profile details that don't
// belong on the core User entity (skills, rate, rating, etc).
@Entity('developer_profiles')
export class DeveloperProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column('simple-array', { default: '' })
  skills: string[];

  @Column({ nullable: true })
  portfolioUrl: string;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  hourlyRate: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  availability: AvailabilityStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
