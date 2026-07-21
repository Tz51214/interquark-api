import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRecord, PaymentStatus, TransactionType } from './entities/payment-record.entity';
import { User } from '../users/entities/user.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { CreatePaymentRecordDto } from './dto/create-payment-record.dto';
import { UpdatePaymentRecordDto } from './dto/update-payment-record.dto';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(PaymentRecord) private readonly repo: Repository<PaymentRecord>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Subscription) private readonly subscriptionsRepo: Repository<Subscription>,
  ) {}

  async create(dto: CreatePaymentRecordDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId as any } });
    if (!user) throw new NotFoundException('User not found.');

    let invoice: Invoice | null = null;
    if (dto.invoiceId) {
      invoice = await this.invoicesRepo.findOne({ where: { id: dto.invoiceId as any } });
      if (!invoice) throw new NotFoundException('Invoice not found.');
    }

    let order: Order | null = null;
    if (dto.orderId) {
      order = await this.ordersRepo.findOne({ where: { id: dto.orderId as any } });
      if (!order) throw new NotFoundException('Order not found.');
    }

    let subscription: Subscription | null = null;
    if (dto.subscriptionId) {
      subscription = await this.subscriptionsRepo.findOne({ where: { id: Number(dto.subscriptionId) } });
      if (!subscription) throw new NotFoundException('Subscription not found.');
    }

    const record = this.repo.create({
      user,
      order,
      invoice,
      subscription,
      amount: dto.amount,
      method: dto.method,
      status: dto.status,
      txnType: dto.txnType,
      stripePaymentIntentId: dto.stripePaymentIntentId,
      notes: dto.notes,
    });
    return this.repo.save(record);
  }

  // Used internally by SubscriptionsService.refund() — creates a
  // refund ledger entry without needing a full DTO round-trip.
  async createRefundForSubscription(
    subscription: Subscription,
    amount: number,
    reason?: string,
  ) {
    const record = this.repo.create({
      user: subscription.freelancer,
      subscription,
      amount,
      method: undefined,
      status: PaymentStatus.REFUNDED,
      txnType: TransactionType.REFUND,
      notes: reason,
    });
    return this.repo.save(record);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findAllTransactions() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByOrder(orderId: string) {
    return this.repo.find({
      where: { order: { id: orderId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  // Powers "view billing history" on the Subscriptions tab.
  findBySubscription(subscriptionId: number) {
    return this.repo.find({
      where: { subscription: { id: subscriptionId } },
      order: { createdAt: 'DESC' },
    });
  }

  // PDF receipt for a single payment record — used by freelancers to
  // download proof of a subscription charge. Same ownership rule as
  // the invoice PDF: only the payment's own user, or an admin.
  async generateReceiptPdf(id: string, requesterId: string, requesterRole: string) {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['user', 'subscription'],
    });
    if (!record) throw new NotFoundException('Payment record not found.');

    if (requesterRole !== 'admin' && record.user.id !== Number(requesterId)) {
      throw new ForbiddenException('You do not have access to this receipt.');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Interquark', { align: 'left' });
      doc.fontSize(10).fillColor('#666').text('Payment receipt', { align: 'left' });
      doc.moveDown(2);

      doc.fillColor('#000').fontSize(12);
      doc.text(`Receipt ID: ${record.id}`);
      doc.text(`Date: ${record.createdAt.toLocaleDateString('en-GB')}`);
      doc.text(`Status: ${record.status.toUpperCase()}`);
      doc.text(`Method: ${record.method.toUpperCase()}`);
      doc.moveDown();

      doc.text(`Billed to: ${record.user.fullName}`);
      doc.text(`Email: ${record.user.email}`);
      if (record.subscription) {
        doc.text(`Plan: ${record.subscription.tier}`);
      }
      doc.moveDown(2);

      doc.fontSize(14).text('Amount', { underline: true });
      doc.fontSize(20).text(`£${Number(record.amount).toFixed(2)}`);
      doc.moveDown(2);

      if (record.notes) {
        doc.fontSize(10).fillColor('#666').text(record.notes);
      }

      doc.end();
    });
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { user: { id: userId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Payment record not found.');
    return record;
  }

  async update(id: string, dto: UpdatePaymentRecordDto) {
    const record = await this.findOne(id);
    if (dto.status) record.status = dto.status;
    if (dto.method) record.method = dto.method;
    if (dto.txnType) record.txnType = dto.txnType;
    if (dto.amount !== undefined) record.amount = dto.amount;
    if (dto.notes !== undefined) record.notes = dto.notes;
    return this.repo.save(record);
  }

  async remove(id: string) {
    const record = await this.findOne(id);
    await this.repo.remove(record);
    return { message: 'Payment record deleted' };
  }
}
