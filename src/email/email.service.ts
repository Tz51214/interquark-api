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

  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.warn(`Brevo API not configured — skipping email to ${to}: "${subject}"`);
      return;
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Interquark', email: this.fromAddress },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Brevo API returned ${res.status}: ${body}`);
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

  async sendPasswordReset(to: string, fullName: string, resetLink: string) {
    await this.send(
      to,
      'Reset your Interquark password',
      `<p>Hi ${fullName},</p><p>We received a request to reset your password. Click the link below to choose a new one — this link expires in 1 hour.</p><p><a href="${resetLink}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p><p>— The Interquark Team</p>`,
    );
  }
}
