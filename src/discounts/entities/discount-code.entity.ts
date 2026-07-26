import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('discount_codes')
export class DiscountCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: DiscountType })
  type: DiscountType;

  // Percentage (e.g. 10 = 10%) or fixed £ amount, depending on type.
  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column({ default: true })
  active: boolean;

  // Null = unlimited uses.
  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
