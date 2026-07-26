import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DiscountsService } from '../discounts/discounts.service';
import { DiscountType } from '../discounts/entities/discount-code.entity';
import { EmailService } from '../email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User, UserRole, VerificationStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Matches Magento's default "Online Customers" session lifetime.
const ONLINE_WINDOW_MINUTES = 15;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly discountsService: DiscountsService,
    private readonly emailService: EmailService,
  ) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  // Generates a short, shareable referral code the first time a user
  // asks for one, then reuses the same code on every future call.
  async getOrCreateReferralCode(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (user.referralCode) return user.referralCode;

    const base = (user.fullName || 'USER')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'USER';

    // Retry with a random suffix on the rare chance of a collision.
    for (let i = 0; i < 5; i++) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${base}${suffix}`;
      const exists = await this.usersRepository.findOne({ where: { referralCode: candidate } });
      if (!exists) {
        user.referralCode = candidate;
        await this.usersRepository.save(user);
        return candidate;
      }
    }
    throw new Error('Could not generate a unique referral code.');
  }

  findByReferralCode(code: string) {
    return this.usersRepository.findOne({ where: { referralCode: code } });
  }

  // Called after a referred user's first successful purchase (order
  // or subscription payment). Grants the referrer a one-time reward
  // discount code — best-effort, called from a try/catch by whoever
  // invokes it so a failure here never blocks the actual payment.
  async grantReferralRewardIfEligible(paidUserId: number) {
    const paidUser = await this.usersRepository.findOne({ where: { id: paidUserId } });
    if (!paidUser || !paidUser.referredByUserId || paidUser.referralRewarded) return;

    const referrer = await this.usersRepository.findOne({
      where: { id: paidUser.referredByUserId },
    });
    if (!referrer) return;

    const rewardCode = `REF${Math.floor(100000 + Math.random() * 900000)}`;
    await this.discountsService.create({
      code: rewardCode,
      type: DiscountType.PERCENTAGE,
      value: 15,
      maxUses: 1,
    });

    paidUser.referralRewarded = true;
    await this.usersRepository.save(paidUser);

    await this.emailService.sendReferralReward(referrer.email, referrer.fullName, rewardCode);
  }

  // Defaults — every toggle is on unless the user has explicitly
  // turned it off. Lets the frontend render a full, sensible set of
  // switches even for users who've never touched this before.
  async getNotificationPreferences(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    return {
      orderUpdates: true,
      invoices: true,
      projectMessages: true,
      projectAssignments: true,
      payouts: true,
      billing: true,
      ...(user.notificationPreferences || {}),
    };
  }

  async updateNotificationPreferences(userId: number, prefs: Record<string, boolean>) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.notificationPreferences = { ...(user.notificationPreferences || {}), ...prefs };
    await this.usersRepository.save(user);
    return user.notificationPreferences;
  }

  async findAll(role?: UserRole) {
    const where = role ? { role } : {};
    const users = await this.usersRepository.find({ where });
    return users.map(({ password, ...safe }) => safe);
  }

  // New — powers the admin "Now Online" view.
  async findOnline() {
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
    const users = await this.usersRepository.find({
      where: { lastActiveAt: MoreThan(cutoff) },
      order: { lastActiveAt: 'DESC' },
    });
    return users.map(({ password, ...safe }) => safe);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    try {
      await this.usersRepository.remove(user);
      return { message: 'User deleted' };
    } catch (err: any) {
      if (err.code === '23503') {
        throw new ConflictException(
          'Cannot delete this user because they have associated orders or projects. Remove those first.',
        );
      }
      throw err;
    }
  }

  async verify(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.verificationStatus = VerificationStatus.VERIFIED;
    return this.usersRepository.save(user);
  }

  async reject(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.verificationStatus = VerificationStatus.REJECTED;
    return this.usersRepository.save(user);
  }
}
