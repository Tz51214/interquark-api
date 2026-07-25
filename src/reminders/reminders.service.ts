import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, IsNull, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

// How long to wait before considering a pending order or an
// unsubscribed freelancer account "abandoned" — long enough that
// we're not emailing someone still mid-checkout.
const ABANDON_THRESHOLD_HOURS = 2;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Subscription) private readonly subsRepo: Repository<Subscription>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl() {
    return this.configService.get<string>('FRONTEND_URL') || 'https://interquark.co.uk';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandonedCarts() {
    const cutoff = new Date(Date.now() - ABANDON_THRESHOLD_HOURS * 60 * 60 * 1000);

    const abandoned = await this.ordersRepo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(cutoff),
        reminderSentAt: IsNull(),
      },
      relations: ['customer', 'items'],
    });

    for (const order of abandoned) {
      const itemNames = order.items?.map((i) => i.name).join(', ') || 'your order';
      await this.emailService.sendAbandonedCartReminder(
        order.customer.email,
        order.customer.fullName,
        itemNames,
        `${this.frontendUrl}/checkout`,
      );
      order.reminderSentAt = new Date();
      await this.ordersRepo.save(order);
      this.logger.log(`Abandoned cart reminder sent to ${order.customer.email}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandonedSignups() {
    const cutoff = new Date(Date.now() - ABANDON_THRESHOLD_HOURS * 60 * 60 * 1000);

    const candidates = await this.usersRepo.find({
      where: {
        role: UserRole.FREELANCER,
        createdAt: LessThan(cutoff),
        signupReminderSentAt: IsNull(),
      },
    });

    for (const user of candidates) {
      const hasSubscription = await this.subsRepo.findOne({
        where: { freelancer: { id: user.id } },
      });
      if (hasSubscription) continue; // they did complete payment, skip

      await this.emailService.sendAbandonedSignupReminder(
        user.email,
        user.fullName,
        `${this.frontendUrl}/subscribe`,
      );
      user.signupReminderSentAt = new Date();
      await this.usersRepo.save(user);
      this.logger.log(`Abandoned signup reminder sent to ${user.email}`);
    }
  }
}
