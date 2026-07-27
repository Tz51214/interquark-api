import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { Project } from '../../projects/entities/project.entity';

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  customer: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  paypalOrderId: string;

  // New — set once an abandoned-checkout reminder email has been
  // sent, so the scheduled job never emails the same pending order
  // twice.
  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date | null;

  // New — the discount code applied at checkout, if any. Kept even
  // after redemption so the order/invoice record shows what was used.
  @Column({ type: 'varchar', nullable: true })
  discountCode: string | null;

  // New — captured at order creation for the admin abandoned-cart
  // report. Best-effort — some proxies/environments may not provide
  // a real client IP, in which case this stays null.
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @OneToMany(() => Project, (project) => project.order)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
