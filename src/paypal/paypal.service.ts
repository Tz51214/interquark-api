import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PayPalService {
  private client: any;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET') || '';
    const mode = this.configService.get<string>('PAYPAL_MODE') || 'sandbox';

    const environment =
      mode === 'live'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  // Creates a PayPal order for a given amount (GBP). Metadata (tier,
  // freelancerId) is stored in custom_id since PayPal orders don't
  // support arbitrary metadata like Stripe does.
  async createOrder(amount: number, customId: string) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'GBP',
            value: amount.toFixed(2),
          },
          custom_id: customId,
        },
      ],
    });

    const response = await this.client.execute(request);
    return response.result; // contains id, status, links (approve URL)
  }

  // Captures payment after the freelancer approves on PayPal's side.
  async captureOrder(orderId: string) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const response = await this.client.execute(request);
    return response.result; // contains status, purchase_units with custom_id
  }

  // New — fetches an order's full details, used to find the actual
  // capture ID for a refund (we only store the PayPal order ID, not
  // the capture ID, at checkout time).
  async getOrder(orderId: string) {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const response = await this.client.execute(request);
    return response.result;
  }

  // New — issues a real refund against a specific capture. This
  // actually returns money to the customer via PayPal, unlike just
  // updating our own database records.
  async refundCapture(captureId: string, amount: number, reason?: string) {
    const request = new paypal.payments.CapturesRefundRequest(captureId);
    request.requestBody({
      amount: {
        currency_code: 'GBP',
        value: amount.toFixed(2),
      },
      note_to_payer: reason,
    });
    const response = await this.client.execute(request);
    return response.result;
  }
}
