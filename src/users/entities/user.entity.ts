import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
  FREELANCER = 'freelancer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  // New — freelancer application status. Clients are always VERIFIED
  // by default since only freelancers go through admin approval.
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.VERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({ nullable: true, select: false })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date;

  // New — updated automatically on every authenticated request (see
  // JwtStrategy). Powers the admin "Now Online" view — a user counts
  // as online if this timestamp is within the last 15 minutes.
  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  // New — per-user toggles for which automated emails they receive.
  // Stored as JSON so we can add more notification types later without
  // a schema migration each time. All default to true (opt-out model).
  @Column({ type: 'simple-json', nullable: true })
  notificationPreferences: {
    orderUpdates?: boolean;
    invoices?: boolean;
    projectMessages?: boolean;
    projectAssignments?: boolean;
    payouts?: boolean;
    billing?: boolean;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
