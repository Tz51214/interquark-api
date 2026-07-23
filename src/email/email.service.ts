import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress = this.configService.get<string>('SMTP_FROM') || 'no-reply@interquark.com';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
  }

  // Safe diagnostic — reports whether each required env var is set
  // (true/false only, never the actual values) and whether the
  // transporter actually initialized. Lets us verify SMTP config
  // without exposing secrets or needing to trigger a real email.
  getDiagnostics() {
    return {
      hostSet: !!this.configService.get<string>('SMTP_HOST'),
      portSet: !!this.configService.get<string>('SMTP_PORT'),
      userSet: !!this.configService.get<string>('SMTP_USER'),
      passSet: !!this.configService.get<string>('SMTP_PASS'),
      fromAddress: this.fromAddress,
      transporterInitialized: !!this.transporter,
    };
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — skipping email to ${to}: "${subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (err) {
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

  // New — order confirmation, sent right after a customer places an order.
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

  // New — notifies the studio inbox when someone submits the "Get in
  // touch" contact form on the homepage.
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

  // New — password reset link, sent from POST /auth/forgot-password.
  async sendPasswordReset(to: string, fullName: string, resetLink: string) {
    await this.send(
      to,
      'Reset your Interquark password',
      `<p>Hi ${fullName},</p><p>We received a request to reset your password. Click the link below to choose a new one — this link expires in 1 hour.</p><p><a href="${resetLink}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p><p>— The Interquark Team</p>`,
    );
  }
}
