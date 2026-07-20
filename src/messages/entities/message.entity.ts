import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => User)
  sender: User;

  @Column({ type: 'text' })
  content: string;

  // New — optional file attachment (PDF/JPG). Stored on disk under
  // /uploads, attachmentUrl is the public path to serve it from.
  @Column({ type: 'varchar', nullable: true })
  attachmentUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  attachmentName: string | null;

  @Column({ type: 'varchar', nullable: true })
  attachmentType: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
