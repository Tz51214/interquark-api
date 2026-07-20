import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailService } from '../email/email.service';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User, UserRole, VerificationStatus } from '../users/entities/user.entity';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { LoginAsCustomerLog } from './entities/login-as-customer-log.entity';
import { RegisterDto, SignupRole } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const TIER_PRICES: Record<string, number> = {
  associate: 29,
  core: 79,
  lead: 159,
};

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
// NOTE: these are no longer used to sign/verify tokens directly — kept
// only as fallback defaults, read via ConfigService inside the class
// instead. Module-level process.env reads happened before dotenv had
// finished loading .env, causing tokens to be signed with the wrong
// secret intermittently.
const DEFAULT_REFRESH_SECRET = 'dev-refresh-secret-change-me';
const DEFAULT_ACCESS_SECRET = 'dev-secret-change-me';

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

// One-time impersonation codes expire fast — this link is only meant
// to be opened once, immediately, in a new tab.
const IMPERSONATION_CODE_EXPIRES_MS = 60 * 1000; // 60 seconds

interface TokenPayload {
  sub: number;
  email: string;
  role: string;
}

interface PendingImpersonation {
  customerId: number;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  // In-memory store for one-time impersonation codes. Fine for a
  // single server instance (local/small deploy). If interquark-api
  // ever runs as multiple instances behind a load balancer, this
  // needs to move to Redis or the database instead — a code generated
  // on instance A wouldn't be visible to instance B.
  private readonly pendingImpersonations = new Map<string, PendingImpersonation>();

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(LoginAsCustomerLog)
    private readonly loginAsLogRepository: Repository<LoginAsCustomerLog>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private get accessSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || DEFAULT_ACCESS_SECRET;
  }

  private get refreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET') || DEFAULT_REFRESH_SECRET;
  }

  private async signTokens(payload: TokenPayload) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
    return { accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const isFreelancer = registerDto.role === SignupRole.FREELANCER;

    const user = this.usersRepository.create({
      fullName: registerDto.fullName,
      email: registerDto.email,
      password: hashedPassword,
      phone: registerDto.phone,
      company: registerDto.company,
      role: isFreelancer ? UserRole.FREELANCER : UserRole.CLIENT,
      verificationStatus: isFreelancer ? VerificationStatus.PENDING : VerificationStatus.VERIFIED,
    });

    const savedUser = await this.usersRepository.save(user);

    if (isFreelancer) {
      await this.emailService.sendFreelancerWelcome(
        savedUser.email,
        savedUser.fullName,
        registerDto.tier,
      );
    } else {
      await this.emailService.sendCustomerWelcome(savedUser.email, savedUser.fullName);
    }

    const { password, ...safeUser } = savedUser;
    return { message: 'Registration successful', user: safeUser };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      select: ['id', 'fullName', 'email', 'password', 'phone', 'company', 'role', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { accessToken, refreshToken } = await this.signTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { password, ...safeUser } = user;
    return { message: 'Login successful', accessToken, refreshToken, user: safeUser };
  }

  async refresh(token: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const { accessToken, refreshToken } = await this.signTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { password, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
      await this.usersRepository.save(user);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;
      await this.emailService.sendPasswordReset(user.email, user.fullName, resetLink);
    }

    return {
      message: 'If an account exists with that email, a reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersRepository.findOne({
      where: { resetPasswordToken: token },
      select: [
        'id',
        'email',
        'fullName',
        'resetPasswordToken',
        'resetPasswordExpires',
      ],
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null as unknown as string;
    user.resetPasswordExpires = null as unknown as Date;
    await this.usersRepository.save(user);

    return { message: 'Password has been reset. You can now sign in.' };
  }

  // New — Step 1 of impersonation. Admin calls this; we log it
  // immediately (so the log reflects intent-to-access even if the
  // link never actually gets opened), and hand back a one-time URL.
  async initiateLoginAs(adminUserId: number, customerId: number) {
    const admin = await this.usersRepository.findOne({ where: { id: adminUserId } });
    if (!admin) throw new NotFoundException('Admin not found.');

    const customer = await this.usersRepository.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found.');

    if (customer.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot log in as another admin account.');
    }

    const code = randomBytes(24).toString('hex');
    this.pendingImpersonations.set(code, {
      customerId: customer.id,
      expiresAt: Date.now() + IMPERSONATION_CODE_EXPIRES_MS,
    });

    // Log the moment it's initiated, not the moment it's redeemed.
    const log = this.loginAsLogRepository.create({ admin, customer });
    await this.loginAsLogRepository.save(log);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return {
      impersonationUrl: `${frontendUrl}/customer?impersonate=${code}`,
    };
  }

  // New — Step 2. The new tab calls this once, immediately, with the
  // code from the URL. Codes are single-use and expire in 60 seconds.
  async redeemImpersonationCode(code: string) {
    const pending = this.pendingImpersonations.get(code);
    this.pendingImpersonations.delete(code); // always consume — no replay, even if expired

    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException('This login link has expired or was already used.');
    }

    const customer = await this.usersRepository.findOne({ where: { id: pending.customerId } });
    if (!customer) throw new NotFoundException('Customer no longer exists.');

    const { accessToken, refreshToken } = await this.signTokens({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
    });

    const { password, ...safeUser } = customer;
    return { accessToken, refreshToken, user: safeUser };
  }

  async findLoginAsLogs() {
    return this.loginAsLogRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
