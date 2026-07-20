import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Order } from '../../orders/entities/order.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum TransactionType {
  AUTHORIZATION = 'authorization',
  CAPTURE = 'capture',
  REFUND = 'refund',
  VOID = 'void',
}

@Entity('payment_records')
export class PaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Order, { nullable: true, eager: true, onDelete: 'SET NULL' })
  order: Order | null;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  invoice: Invoice | null;

  // New — lets a payment record represent a subscription charge or
  // refund, not just an order-based one. Powers the freelancer billing
  // history view on the Subscriptions tab.
  @ManyToOne(() => Subscription, { nullable: true, onDelete: 'SET NULL' })
  subscription: Subscription | null;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.STRIPE })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.CAPTURE,
  })
  txnType: TransactionType;

  @Column({ type: 'varchar', nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
