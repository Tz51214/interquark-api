import { Body, Controller, Headers, Post, RawBody, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreatePaypalOrderDto } from './dto/create-paypal-order.dto';
import { CapturePaypalOrderDto } from './dto/capture-paypal-order.dto';
import { CreateOrderPaypalDto } from './dto/create-order-paypal.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout-session')
  createCheckoutSession(@Req() req: any, @Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto.orderId, req.user.userId);
  }

  // Stripe — freelancer starts a subscription checkout for a chosen tier.
  @UseGuards(JwtAuthGuard)
  @Post('subscription-checkout-session')
  createSubscriptionCheckoutSession(@Req() req: any, @Body() dto: CreateSubscriptionCheckoutDto) {
    return this.paymentsService.createSubscriptionCheckoutSession(
      dto.tier,
      req.user.userId,
      req.user.email,
    );
  }

  @Post('webhook')
  handleWebhook(@RawBody() rawBody: Buffer, @Headers('stripe-signature') signature: string) {
    return this.paymentsService.handleWebhookEvent(rawBody, signature);
  }

  // New — PayPal, step 1: create the order, get back the approval URL
  // the frontend redirects the freelancer to.
  @UseGuards(JwtAuthGuard)
  @Post('paypal/create-order')
  createPaypalOrder(@Req() req: any, @Body() dto: CreatePaypalOrderDto) {
    return this.paymentsService.createPaypalOrder(dto.tier, req.user.userId);
  }

  // New — PayPal, step 2: capture after the freelancer approves.
  // Frontend calls this once PayPal redirects back with the order ID.
  @UseGuards(JwtAuthGuard)
  @Post('paypal/capture-order')
  capturePaypalOrder(@Body() dto: CapturePaypalOrderDto) {
    return this.paymentsService.capturePaypalOrder(dto.orderId);
  }

  // New — customer order PayPal checkout, step 1.
  @UseGuards(JwtAuthGuard)
  @Post('paypal/order/create')
  createOrderPaypalOrder(@Req() req: any, @Body() dto: CreateOrderPaypalDto) {
    return this.paymentsService.createOrderPaypalOrder(dto.orderId, req.user.userId);
  }

  // New — customer order PayPal checkout, step 2.
  @UseGuards(JwtAuthGuard)
  @Post('paypal/order/capture')
  captureOrderPaypalOrder(@Body() dto: CapturePaypalOrderDto) {
    return this.paymentsService.captureOrderPaypalOrder(dto.orderId);
  }
}
