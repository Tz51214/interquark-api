import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly repo: Repository<Invoice>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  // Builds a PDF buffer for a single invoice. Throws if the invoice
  // doesn't exist, or if the requesting user isn't the invoice's own
  // customer and isn't an admin — same ownership rule as findMine.
  async generatePdf(id: string, requesterId: string, requesterRole: string) {
    const invoice = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'order'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    if (requesterRole !== 'admin' && invoice.customer.id !== Number(requesterId)) {
      throw new ForbiddenException('You do not have access to this invoice.');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Interquark', { align: 'left' });
      doc.fontSize(10).fillColor('#666').text('Invoice', { align: 'left' });
      doc.moveDown(2);

      doc.fillColor('#000').fontSize(12);
      doc.text(`Invoice number: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${invoice.createdAt.toLocaleDateString('en-GB')}`);
      doc.text(`Status: ${invoice.status.toUpperCase()}`);
      doc.moveDown();

      doc.text(`Billed to: ${invoice.customer.fullName}`);
      doc.text(`Email: ${invoice.customer.email}`);
      doc.moveDown(2);

      doc.fontSize(14).text('Amount due', { underline: true });
      doc.fontSize(20).text(`£${Number(invoice.amount).toFixed(2)}`);
      doc.moveDown(2);

      if (invoice.notes) {
        doc.fontSize(10).fillColor('#666').text(invoice.notes);
      }

      doc.end();
    });
  }

  private async nextInvoiceNumber() {
    const count = await this.repo.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateInvoiceDto) {
    const customer = await this.usersRepo.findOne({ where: { id: dto.customerId as any } });
    if (!customer) throw new NotFoundException('Customer not found.');

    let order: Order | null = null;
    if (dto.orderId) {
      order = await this.ordersRepo.findOne({ where: { id: dto.orderId as any } });
      if (!order) throw new NotFoundException('Order not found.');
    }

    const invoice = this.repo.create({
      invoiceNumber: await this.nextInvoiceNumber(),
      customer,
      order,
      amount: dto.amount,
      status: dto.status ?? InvoiceStatus.DRAFT,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      notes: dto.notes,
    });
    return this.repo.save(invoice);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { customer: { id: userId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  // New — used by the order refund flow to find the invoice tied to
  // a given order, so it can be marked REFUNDED alongside the order.
  findByOrder(orderId: string) {
    return this.repo.findOne({
      where: { order: { id: orderId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.repo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    if (dto.status === InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PAID) {
      invoice.paidAt = new Date();
    }
    if (dto.status) invoice.status = dto.status;
    if (dto.amount !== undefined) invoice.amount = dto.amount;
    if (dto.dueAt) invoice.dueAt = new Date(dto.dueAt);
    if (dto.notes !== undefined) invoice.notes = dto.notes;

    return this.repo.save(invoice);
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    await this.repo.remove(invoice);
    return { message: 'Invoice deleted' };
  }
}
