import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

export enum CreditMemoStatus {
  PENDING = 'pending',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// Matches the Magento "Credit Memos" grid — a refund issued against a
// specific order/invoice, with a reason and its own status separate
// from the order's own status.
@Entity('credit_memos')
export class CreditMemo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  creditMemoNumber: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  customer: User;

  @ManyToOne(() => Order, { eager: true, onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Invoice, { nullable: true, eager: true, onDelete: 'SET NULL' })
  invoice: Invoice | null;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: CreditMemoStatus, default: CreditMemoStatus.PENDING })
  status: CreditMemoStatus;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
