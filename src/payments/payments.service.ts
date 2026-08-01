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
import { InvoicesService } from '../invoices/invoices.service';
import { InvoiceStatus } from '../invoices/entities/invoice.entity';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paypalService: PayPalService,
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
    private readonly discountsService: DiscountsService,
    private readonly usersService: UsersService,
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
  // Admin-only reconciliation — for cases where a customer's payment
  // genuinely shows on PayPal but our order is still stuck at pending
  // (the return flow failed to record it, e.g. a lost session). Checks
  // PayPal's actual current status for the order and either captures
  // it (if approved but not yet captured) or syncs our record to match
  // (if PayPal already shows it completed) — never blindly re-captures
  // an already-captured order, which PayPal would reject anyway.
  async reconcileOrderWithPaypal(orderId: number) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'customer'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.paypalOrderId) {
      throw new BadRequestException(
        'This order was never sent to PayPal — there is nothing to reconcile.',
      );
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('This order is not pending — nothing to reconcile.');
    }

    const paypalOrder = await this.paypalService.getOrder(order.paypalOrderId);

    if (paypalOrder.status === 'COMPLETED') {
      // PayPal already captured it, but our record never got updated —
      // just sync, don't try to capture again (that would fail).
      return this.finalizeSuccessfulOrder(order, paypalOrder);
    }

    if (paypalOrder.status === 'APPROVED') {
      // Customer approved on PayPal's side but our capture call never
      // fired (or failed) — actually capture it now.
      const captureResult = await this.paypalService.captureOrder(order.paypalOrderId);
      if (captureResult.status !== 'COMPLETED') {
        throw new BadRequestException(
          `PayPal capture did not complete (status: ${captureResult.status}).`,
        );
      }
      return this.finalizeSuccessfulOrder(order, captureResult);
    }

    // CREATED (or anything else) — the customer never actually
    // approved payment on PayPal's side. Nothing to capture.
    throw new BadRequestException(
      `PayPal shows this order as "${paypalOrder.status}" — the customer never completed approval, so there is no payment to capture.`,
    );
  }

  // Shared finishing logic for a genuinely captured order — sets
  // status, redeems discounts/referrals, creates the invoice, and
  // sends the receipt. Used by both the normal return-flow capture and
  // the admin reconciliation path above, so behavior stays identical.
  // Server-side GA4 purchase tracking — only needed here, for orders
  // finalized through admin reconciliation. Normal checkout already
  // fires this client-side via gtag in the browser; adding it there
  // too would double-count real purchases. Best-effort: a tracking
  // failure should never block the order from completing.
  private async trackServerSidePurchase(order: Order) {
    const measurementId = this.configService.get<string>('GA4_MEASUREMENT_ID');
    const apiSecret = this.configService.get<string>('GA4_API_SECRET');
    if (!measurementId || !apiSecret) return;

    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: 'POST',
          body: JSON.stringify({
            // A random client_id is fine here — GA4 still records the
            // revenue and event correctly; it just won't attribute to
            // the original browsing session, which no longer exists
            // for an order recovered this way.
            client_id: `admin-reconcile-${order.id}-${Date.now()}`,
            events: [
              {
                name: 'purchase',
                params: {
                  transaction_id: String(order.id),
                  currency: 'GBP',
                  value: Number(order.totalAmount),
                  items: order.items?.map((i) => ({
                    item_id: i.sku,
                    item_name: i.name,
                    item_variant: i.tier,
                    price: Number(i.price),
                    quantity: 1,
                  })),
                },
              },
            ],
          }),
        },
      );
    } catch (err) {
      // Best-effort — never let an analytics failure block the order.
    }
  }

  private async finalizeSuccessfulOrder(order: Order, paypalResult: any) {
    order.status = OrderStatus.ACTIVE;
    await this.ordersRepository.save(order);
    await this.trackServerSidePurchase(order);

    if (order.discountCode) {
      await this.discountsService.redeem(order.discountCode);
    }

    try {
      await this.usersService.grantReferralRewardIfEligible(order.customer.id);
    } catch (err) {
      // Logged inside usersService/emailService already.
    }

    try {
      let invoice = await this.invoicesService.findByOrder(String(order.id));
      if (!invoice) {
        invoice = await this.invoicesService.create({
          customerId: String(order.customer.id),
          orderId: String(order.id),
          amount: Number(order.totalAmount),
          status: InvoiceStatus.PAID,
        });
      } else if (invoice.status !== InvoiceStatus.PAID) {
        await this.invoicesService.update(invoice.id, { status: InvoiceStatus.PAID });
      }
      const invoicePdf = await this.invoicesService.generatePdf(
        invoice.id,
        String(order.customer.id),
        'admin',
      );
      const itemNames = order.items?.map((i) => i.name).join(', ') || 'your order';
      await this.emailService.sendOrderReceipt(
        order.customer.email,
        order.customer.fullName,
        itemNames,
        Number(order.totalAmount),
        invoicePdf,
        invoice.invoiceNumber,
      );
    } catch (err) {
      // Logged inside emailService/invoicesService already.
    }

    return {
      received: true,
      orderId: order.id,
      totalAmount: Number(order.totalAmount),
      items: order.items?.map((i) => ({
        name: i.name,
        sku: i.sku,
        tier: i.tier,
        price: Number(i.price),
      })),
    };
  }

  async captureOrderPaypalOrder(paypalOrderId: string) {
    const result = await this.paypalService.captureOrder(paypalOrderId);

    if (result.status !== 'COMPLETED') {
      throw new BadRequestException('PayPal payment was not completed');
    }

    const orderId = Number(result.purchase_units?.[0]?.custom_id);
    if (!orderId) {
      throw new BadRequestException('Could not resolve order details from PayPal order');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'customer'],
    });
    if (order) {
      order.status = OrderStatus.ACTIVE;
      await this.ordersRepository.save(order);

      if (order.discountCode) {
        await this.discountsService.redeem(order.discountCode);
      }

      try {
        await this.usersService.grantReferralRewardIfEligible(order.customer.id);
      } catch (err) {
        // Logged inside usersService/emailService already.
      }

      // Create the invoice now — payment has genuinely succeeded at
      // this point, so it's created (or reused, in case one already
      // exists) as PAID, then emailed as a real receipt. Best-effort;
      // a failure here shouldn't block the order from activating.
      try {
        let invoice = await this.invoicesService.findByOrder(String(order.id));
        if (!invoice) {
          invoice = await this.invoicesService.create({
            customerId: String(order.customer.id),
            orderId: String(order.id),
            amount: Number(order.totalAmount),
            status: InvoiceStatus.PAID,
          });
        } else if (invoice.status !== InvoiceStatus.PAID) {
          await this.invoicesService.update(invoice.id, { status: InvoiceStatus.PAID });
        }
        const invoicePdf = await this.invoicesService.generatePdf(
          invoice.id,
          String(order.customer.id),
          'admin',
        );
        const itemNames = order.items?.map((i) => i.name).join(', ') || 'your order';
        await this.emailService.sendOrderReceipt(
          order.customer.email,
          order.customer.fullName,
          itemNames,
          Number(order.totalAmount),
          invoicePdf,
          invoice.invoiceNumber,
        );
      } catch (err) {
        // Logged inside emailService/invoicesService already.
      }
    }

    return {
      received: true,
      orderId,
      totalAmount: order ? Number(order.totalAmount) : 0,
      items: order?.items?.map((i) => ({
        name: i.name,
        sku: i.sku,
        tier: i.tier,
        price: Number(i.price),
      })) || [],
    };
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
