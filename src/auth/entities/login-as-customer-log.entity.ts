import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// One row per "log in as this customer" action — logged the moment an
// admin initiates it, not when it's redeemed, matching Magento's
// behavior for its Customers > Login as Customer Log grid.
@Entity('login_as_customer_logs')
export class LoginAsCustomerLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  admin: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  customer: User;

  @CreateDateColumn()
  createdAt: Date;
}
