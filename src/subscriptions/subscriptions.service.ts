import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, SubscriptionTier } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { RefundSubscriptionDto } from './dto/refund-subscription.dto';
import { LedgerService } from '../ledger/ledger.service';
import { PaymentMethod, PaymentStatus, TransactionType } from '../ledger/entities/payment-record.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly ledgerService: LedgerService,
  ) {}

  create(createSubscriptionDto: CreateSubscriptionDto) {
    const subscription = this.subscriptionsRepository.create(createSubscriptionDto as any);
    return this.subscriptionsRepository.save(subscription);
  }

  findAll() {
    return this.subscriptionsRepository.find({
      relations: ['freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  findMine(freelancerId: number) {
    return this.subscriptionsRepository.find({
      where: { freelancer: { id: freelancerId } },
      relations: ['freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['freelancer'],
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async update(id: number, updateSubscriptionDto: UpdateSubscriptionDto) {
    const subscription = await this.findOne(id);
    Object.assign(subscription, updateSubscriptionDto);
    return this.subscriptionsRepository.save(subscription);
  }

  async remove(id: number) {
    const subscription = await this.findOne(id);
    return this.subscriptionsRepository.remove(subscription);
  }

  // New — apply a discount/coupon.
  async applyDiscount(id: number, dto: ApplyDiscountDto) {
    const subscription = await this.findOne(id);
    subscription.discountCode = dto.code ?? null;
    subscription.discountPercent = dto.percent;
    return this.subscriptionsRepository.save(subscription);
  }

  // New — force-cancel, for disputes/edge cases rather than the
  // freelancer's own normal cancellation flow.
  async forceCancel(id: number, dto: CancelSubscriptionDto) {
    const subscription = await this.findOne(id);
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = dto.reason;
    return this.subscriptionsRepository.save(subscription);
  }

  // New — issues a refund by creating a ledger entry. Doesn't change
  // subscription status on its own (a refund and a cancellation are
  // separate admin actions, matching how Magento treats them too).
  async refund(id: number, dto: RefundSubscriptionDto) {
    const subscription = await this.findOne(id);
    return this.ledgerService.createRefundForSubscription(
      subscription,
      dto.amount,
      dto.reason,
    );
  }

  // New — billing history for one subscription.
  billingHistory(id: number) {
    return this.ledgerService.findBySubscription(id);
  }

  // New — called by the payments webhook (Stripe now, PayPal later)
  // after a successful checkout. Creates the subscription row plus a
  // matching ledger entry in one place, so every gateway produces an
  // identical result in the system.
  async activateFromPayment(params: {
    freelancerId: number;
    tier: SubscriptionTier;
    price: number;
    gateway: PaymentMethod;
    externalPaymentId: string;
  }) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = this.subscriptionsRepository.create({
      freelancer: { id: params.freelancerId } as any,
      tier: params.tier,
      price: params.price,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    });
    const saved = await this.subscriptionsRepository.save(subscription);

    await this.ledgerService.create({
      userId: String(params.freelancerId),
      subscriptionId: String(saved.id),
      amount: params.price,
      method: params.gateway,
      status: PaymentStatus.SUCCEEDED,
      txnType: TransactionType.CAPTURE,
      stripePaymentIntentId:
        params.gateway === PaymentMethod.STRIPE ? params.externalPaymentId : undefined,
      notes:
        params.gateway !== PaymentMethod.STRIPE
          ? `${params.gateway} reference: ${params.externalPaymentId}`
          : undefined,
    });

    return saved;
  }
}
