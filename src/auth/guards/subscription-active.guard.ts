import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../subscriptions/entities/subscription.entity';

// Blocks access unless the logged-in freelancer has at least one
// subscription with status ACTIVE. Used on freelancer portal routes —
// signup no longer grants a subscription for free, payment does.
@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const activeSubscription = await this.subscriptionsRepository.findOne({
      where: { freelancer: { id: user.userId }, status: SubscriptionStatus.ACTIVE },
    });

    if (!activeSubscription) {
      throw new ForbiddenException('An active subscription is required to access this.');
    }

    return true;
  }
}
