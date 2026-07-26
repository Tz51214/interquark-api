import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiKey: string | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || null;
    this.fromAddress = this.configService.get<string>('SMTP_FROM') || 'no-reply@interquark.co.uk';
  }

  // Safe diagnostic — reports whether the API key is set (true/false
  // only, never the actual value).
  getDiagnostics() {
    return {
      apiKeySet: !!this.apiKey,
      fromAddress: this.fromAddress,
    };
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    attachment?: { name: string; content: Buffer },
  ) {
    if (!this.apiKey) {
      this.logger.warn(`Brevo API not configured — skipping email to ${to}: "${subject}"`);
      return;
    }
    try {
      const body: Record<string, any> = {
        sender: { name: 'Interquark', email: this.fromAddress },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };

      if (attachment) {
        body.attachment = [
          { name: attachment.name, content: attachment.content.toString('base64') },
        ];
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Brevo API returned ${res.status}: ${errBody}`);
      }

      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendCustomerWelcome(to: string, fullName: string) {
    await this.send(
      to,
      'Welcome to Interquark',
      `<p>Hi ${fullName},</p><p>Welcome to Interquark! Your account has been created. You can now browse services and place orders.</p><p>— The Interquark Team</p>`,
    );
  }

  // New — sent right after a freelancer's subscription payment
  // succeeds, with the actual payment receipt PDF attached.
  async sendSubscriptionReceipt(
    to: string,
    fullName: string,
    tier: string,
    amount: number,
    receiptPdf: Buffer,
    receiptId: string,
  ) {
    if (!this.apiKey) {
      this.logger.warn(`Brevo API not configured — skipping receipt email to ${to}`);
      return;
    }
    try {
      const email = {
        sender: { name: 'Interquark', email: this.fromAddress },
        to: [{ email: to }],
        subject: 'Your Interquark subscription is active — receipt attached',
        htmlContent: `<p>Hi ${fullName},</p><p>Your payment of £${amount.toFixed(2)} for the <strong>${tier}</strong> plan was successful, and your freelancer account is now active.</p><p>Your receipt is attached to this email.</p><p>— The Interquark Team</p>`,
        attachment: [
          { name: `receipt-${receiptId}.pdf`, content: receiptPdf.toString('base64') },
        ],
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(email),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Brevo API returned ${res.status}: ${errBody}`);
      }

      this.logger.log(`Subscription receipt sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send subscription receipt to ${to}: ${err.message}`);
    }
  }

  async sendFreelancerWelcome(to: string, fullName: string, tier?: string) {
    await this.send(
      to,
      'Welcome to Interquark — Freelancer Account Created',
      `<p>Hi ${fullName},</p><p>Your freelancer account is set up${tier ? ` on the <strong>${tier}</strong> plan` : ''}. You'll be notified here whenever you're assigned a new project.</p><p>— The Interquark Team</p>`,
    );
  }

  async sendFreelancerAssigned(to: string, freelancerName: string, orderItems: string) {
    await this.send(
      to,
      'New Project Assigned',
      `<p>Hi ${freelancerName},</p><p>You've been assigned a new project: <strong>${orderItems}</strong>. Please log in to view details.</p><p>— The Interquark Team</p>`,
    );
  }

  async sendProjectStatusUpdate(
    to: string,
    customerName: string,
    orderItems: string,
    status: string,
  ) {
    const statusLabel = status.replace('_', ' ');
    await this.send(
      to,
      `Order Update: ${statusLabel}`,
      `<p>Hi ${customerName},</p><p>Your order for <strong>${orderItems}</strong> is now marked as <strong>${statusLabel}</strong>.</p><p>— The Interquark Team</p>`,
    );
  }

  // New — sent right after a customer's order payment succeeds,
  // with the actual invoice PDF attached.
  async sendOrderReceipt(
    to: string,
    fullName: string,
    orderItems: string,
    amount: number,
    invoicePdf: Buffer,
    invoiceNumber: string,
  ) {
    if (!this.apiKey) {
      this.logger.warn(`Brevo API not configured — skipping order receipt email to ${to}`);
      return;
    }
    try {
      const email = {
        sender: { name: 'Interquark', email: this.fromAddress },
        to: [{ email: to }],
        subject: 'Your Interquark order is confirmed — invoice attached',
        htmlContent: `<p>Hi ${fullName},</p><p>Your payment of £${amount.toFixed(2)} for <strong>${orderItems}</strong> was successful. We'll be in touch shortly to get things moving.</p><p>Your invoice is attached to this email.</p><p>— The Interquark Team</p>`,
        attachment: [
          { name: `${invoiceNumber}.pdf`, content: invoicePdf.toString('base64') },
        ],
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(email),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Brevo API returned ${res.status}: ${errBody}`);
      }

      this.logger.log(`Order receipt sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send order receipt to ${to}: ${err.message}`);
    }
  }

  async sendOrderConfirmation(
    to: string,
    fullName: string,
    orderItems: string,
    total: number,
  ) {
    await this.send(
      to,
      'Order confirmation — Interquark',
      `<p>Hi ${fullName},</p><p>Thanks for your order! Here's what you ordered:</p><p><strong>${orderItems}</strong></p><p>Total: £${total.toLocaleString()}</p><p>We'll be in touch shortly to get things moving. You can view this order any time from your customer portal.</p><p>— The Interquark Team</p>`,
    );
  }

  async sendContactNotification(
    fromName: string,
    fromEmail: string,
    message: string,
  ) {
    const notifyTo = this.configService.get<string>('CONTACT_NOTIFY_EMAIL') || this.fromAddress;
    await this.send(
      notifyTo,
      `New contact form message from ${fromName}`,
      `<p><strong>From:</strong> ${fromName} (${fromEmail})</p><p><strong>Message:</strong></p><p>${message}</p>`,
    );
  }

  async sendAbandonedCartReminder(
    to: string,
    fullName: string,
    orderItems: string,
    checkoutLink: string,
  ) {
    await this.send(
      to,
      "You left something in your cart — Interquark",
      `<p>Hi ${fullName},</p><p>You started an order for <strong>${orderItems}</strong> but didn't finish checking out. Your items are still saved.</p><p><a href="${checkoutLink}">Complete your order</a></p><p>— The Interquark Team</p>`,
    );
  }

  async sendAbandonedSignupReminder(to: string, fullName: string, subscribeLink: string) {
    await this.send(
      to,
      "Finish setting up your Interquark freelancer account",
      `<p>Hi ${fullName},</p><p>You created a freelancer account on Interquark but haven't activated your membership plan yet. Pick a plan to start getting matched with projects.</p><p><a href="${subscribeLink}">Choose your plan</a></p><p>— The Interquark Team</p>`,
    );
  }

  async sendReferralReward(to: string, fullName: string, rewardCode: string) {
    await this.send(
      to,
      "Someone you referred just made a purchase — here's your reward",
      `<p>Hi ${fullName},</p><p>Great news — someone you referred to Interquark just completed their first purchase! As a thank you, here's a 15% off code for your next order or subscription:</p><p style="font-size: 20px; font-weight: bold;">${rewardCode}</p><p>— The Interquark Team</p>`,
    );
  }

  async sendPasswordReset(to: string, fullName: string, resetLink: string) {
    await this.send(
      to,
      'Reset your Interquark password',
      `<p>Hi ${fullName},</p><p>We received a request to reset your password. Click the link below to choose a new one — this link expires in 1 hour.</p><p><a href="${resetLink}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p><p>— The Interquark Team</p>`,
    );
  }
}
