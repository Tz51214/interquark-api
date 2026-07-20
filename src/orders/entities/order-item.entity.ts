import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column()
  tier: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;
}
