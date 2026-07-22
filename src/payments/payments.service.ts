import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TIER_PRICING } from '../subscriptions/tier-pricing';
import { SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { PaymentMethod } from '../ledger/entities/payment-record.entity';
import { PayPalService } from '../paypal/paypal.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paypalService: PayPalService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2025-06-30.basil' as any,
    });
  }

  async createCheckoutSession(orderId: number, userId: number) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'items'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customer.id !== userId) {
      throw new BadRequestException('This order does not belong to you');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('This order has already been processed');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5500';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'amazon_pay'],
      billing_address_collection: 'required',
      line_items: order.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: `${item.name} (${item.tier})` },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: 1,
      })),
      success_url: `${frontendUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout.html`,
      metadata: { type: 'order', orderId: String(order.id) },
    });

    order.stripeSessionId = session.id;
    await this.ordersRepository.save(order);

    return { url: session.url };
  }

  // Stripe subscription checkout.
  async createSubscriptionCheckoutSession(tier: SubscriptionTier, freelancerId: number, freelancerEmail: string) {
    const plan = TIER_PRICING[tier];
    if (!plan) throw new BadRequestException('Invalid subscription tier');

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5500';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: freelancerEmail,
      billing_address_collection: 'required',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: `Interquark ${plan.label} subscription` },
            unit_amount: Math.round(plan.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/subscription-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription.html`,
      metadata: { type: 'subscription', freelancerId: String(freelancerId), tier },
    });

    return { url: session.url };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret || '');
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const type = session.metadata?.type;

      if (type === 'subscription') {
        const freelancerId = Number(session.metadata?.freelancerId);
        const tier = session.metadata?.tier as SubscriptionTier;
        const plan = TIER_PRICING[tier];

        if (freelancerId && tier && plan) {
          await this.subscriptionsService.activateFromPayment({
            freelancerId,
            tier,
            price: plan.price,
            gateway: PaymentMethod.STRIPE,
            externalPaymentId: (session.payment_intent as string) || session.id,
          });
        }
      } else {
        const orderId = Number(session.metadata?.orderId);
        if (orderId) {
          const order = await this.ordersRepository.findOne({ where: { id: orderId } });
          if (order) {
            order.status = OrderStatus.ACTIVE;
            await this.ordersRepository.save(order);
          }
        }
      }
    }

    return { received: true };
  }

  // New — PayPal subscription checkout, step 1: create the order.
  // custom_id packs freelancerId + tier together since PayPal orders
  // don't support arbitrary metadata like Stripe does.
  async createPaypalOrder(tier: SubscriptionTier, freelancerId: number) {
    const plan = TIER_PRICING[tier];
    if (!plan) throw new BadRequestException('Invalid subscription tier');

    const customId = `${freelancerId}:${tier}`;
    const order = await this.paypalService.createOrder(plan.price, customId, '/paypal/return');

    const approveLink = order.links?.find((link: any) => link.rel === 'approve');
    return { orderId: order.id, approveUrl: approveLink?.href };
  }

  // New — PayPal subscription checkout, step 2: capture after the
  // freelancer approves on PayPal's site. Calls the same
  // activateFromPayment() method Stripe uses, so both gateways produce
  // an identical subscription + ledger record.
  async capturePaypalOrder(orderId: string) {
    const result = await this.paypalService.captureOrder(orderId);

    if (result.status !== 'COMPLETED') {
      throw new BadRequestException('PayPal payment was not completed');
    }

    const customId = result.purchase_units?.[0]?.custom_id as string;
    const [freelancerIdStr, tier] = (customId || '').split(':');
    const freelancerId = Number(freelancerIdStr);
    const plan = TIER_PRICING[tier as SubscriptionTier];

    if (!freelancerId || !plan) {
      throw new BadRequestException('Could not resolve subscription details from PayPal order');
    }

    const captureId =
      result.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

    return this.subscriptionsService.activateFromPayment({
      freelancerId,
      tier: tier as SubscriptionTier,
      price: plan.price,
      gateway: PaymentMethod.PAYPAL,
      externalPaymentId: captureId,
    });
  }

  // New — PayPal order checkout (customer orders, not subscriptions),
  // step 1: create the order. custom_id just carries the orderId since
  // there's no tier/freelancer info needed for this flow.
  async createOrderPaypalOrder(orderId: number, userId: number) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'items'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customer.id !== userId) {
      throw new BadRequestException('This order does not belong to you');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('This order has already been processed');
    }

    const paypalOrder = await this.paypalService.createOrder(
      Number(order.totalAmount),
      String(order.id),
      '/paypal/return',
    );

    order.paypalOrderId = paypalOrder.id;
    await this.ordersRepository.save(order);

    const approveLink = paypalOrder.links?.find((link: any) => link.rel === 'approve');
    return { orderId: paypalOrder.id, approveUrl: approveLink?.href };
  }

  // New — PayPal order checkout, step 2: capture after the customer
  // approves on PayPal's site.
  async captureOrderPaypalOrder(paypalOrderId: string) {
    const result = await this.paypalService.captureOrder(paypalOrderId);

    if (result.status !== 'COMPLETED') {
      throw new BadRequestException('PayPal payment was not completed');
    }

    const orderId = Number(result.purchase_units?.[0]?.custom_id);
    if (!orderId) {
      throw new BadRequestException('Could not resolve order details from PayPal order');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (order) {
      order.status = OrderStatus.ACTIVE;
      await this.ordersRepository.save(order);
    }

    return { received: true, orderId };
  }

  // New — issues a real refund for an order, through whichever gateway
  // it was actually paid with. This is what actually returns money to
  // the customer, as opposed to just updating our own records.
  async refundOrderPayment(orderId: number, amount: number, reason?: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.stripeSessionId) {
      const session = await this.stripe.checkout.sessions.retrieve(order.stripeSessionId);
      const paymentIntentId = session.payment_intent as string;
      if (!paymentIntentId) {
        throw new BadRequestException('No Stripe payment found for this order — it may not have been paid yet.');
      }
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100),
        reason: 'requested_by_customer',
      });
      return { gateway: 'stripe', refundId: refund.id, status: refund.status };
    }

    if (order.paypalOrderId) {
      const paypalOrder = await this.paypalService.getOrder(order.paypalOrderId);
      const captureId = paypalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      if (!captureId) {
        throw new BadRequestException('No PayPal capture found for this order — it may not have been paid yet.');
      }
      const refund = await this.paypalService.refundCapture(captureId, amount, reason);
      return { gateway: 'paypal', refundId: refund.id, status: refund.status };
    }

    throw new BadRequestException('This order has no associated payment to refund.');
  }
}
