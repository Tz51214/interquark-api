import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum ProjectStatus {
  UNASSIGNED = 'unassigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.projects)
  order: Order;

  @ManyToOne(() => User, { nullable: true, eager: true })
  freelancer: User | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.UNASSIGNED,
  })
  status: ProjectStatus;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
