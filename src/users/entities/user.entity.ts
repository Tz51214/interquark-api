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
  // New — set once an abandoned-signup reminder email has been sent to
  // a freelancer who registered but never completed subscription
  // payment, so the scheduled job never emails them twice.
  @Column({ type: 'timestamp', nullable: true })
  signupReminderSentAt: Date | null;

  // New — every user gets a unique referral code, generated on first
  // access (see UsersService.getOrCreateReferralCode). Sharing their
  // referral link rewards them when someone they refer makes their
  // first purchase.
  @Column({ type: 'varchar', nullable: true, unique: true })
  referralCode: string | null;

  // New — set at registration if the person signed up via someone
  // else's referral link. Null for organic signups.
  @Column({ type: 'int', nullable: true })
  referredByUserId: number | null;

  // New — set once the referral reward has actually been granted
  // (first purchase/subscription), so it only fires once per referral.
  @Column({ default: false })
  referralRewarded: boolean;

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
