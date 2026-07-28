import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { UserRole } from '../users/entities/user.entity';

// Tells the frontend whether the logged-in user is allowed into their
// portal — freelancers need an active paid subscription, customers
// need at least one order that's actually been paid for. Signing up
// alone never grants portal access; payment does.
@Controller('portal-access')
@UseGuards(JwtAuthGuard)
export class PortalAccessController {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  @Get()
  async check(@Req() req: any) {
    const { userId, role } = req.user;

    if (role === UserRole.FREELANCER) {
      const activeSubscription = await this.subscriptionsRepository.findOne({
        where: { freelancer: { id: userId }, status: SubscriptionStatus.ACTIVE },
      });
      return {
        hasAccess: !!activeSubscription,
        reason: activeSubscription ? null : 'An active subscription is required.',
      };
    }

    if (role === UserRole.CLIENT) {
      const paidOrder = await this.ordersRepository.findOne({
        where: [
          { customer: { id: userId }, status: OrderStatus.ACTIVE },
          { customer: { id: userId }, status: OrderStatus.COMPLETED },
        ],
      });
      return {
        hasAccess: !!paidOrder,
        reason: paidOrder ? null : 'A completed order is required.',
      };
    }

    // Admins and any other role aren't gated by payment.
    return { hasAccess: true, reason: null };
  }
}
