import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SubscriptionTier {
  ASSOCIATE = 'associate',
  CORE = 'core',
  LEAD = 'lead',
}

// Kept "cancelled" (existing spelling already in your DB) rather than
// switching to "canceled" — changing it would mismatch every existing
// row. Added trialing/past_due alongside the two that already existed.
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  freelancer: User;

  @Column({ type: 'enum', enum: SubscriptionTier })
  tier: SubscriptionTier;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  // New fields below — all nullable so existing rows don't need
  // backfilling.
  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  // "Next renewal" — when the current billing period ends.
  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'varchar', nullable: true })
discountCode: string | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discountPercent: number | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
