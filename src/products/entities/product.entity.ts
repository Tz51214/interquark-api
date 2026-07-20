import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  // e.g. { "Standard": 300, "Rush (3 days)": 450 } — mirrors the tier
  // structure already used on the storefront catalog.
  @Column({ type: 'jsonb', default: {} })
  tiers: Record<string, number>;

  @Column({ type: 'varchar', nullable: true })
badge: string | null; 

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
