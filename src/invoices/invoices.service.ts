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
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = doc.page.margins.left;
      const brand = '#5b5fef';
      const dark = '#0b1120';
      const gray = '#64748b';
      const lightBorder = '#e2e8f0';

      // Header: company on the left, invoice meta on the right
      doc.fontSize(22).fillColor(brand).font('Helvetica-Bold').text('Interquark', left, 50);
      doc.fontSize(9).fillColor(gray).font('Helvetica')
        .text('Interquark Ltd', left, 78)
        .text('23 Abbot Street, Wrexham, LL11 1TA', left, 91)
        .text('hello@interquark.co.uk', left, 104);

      doc.fontSize(20).fillColor(dark).font('Helvetica-Bold')
        .text('INVOICE', left, 50, { width: pageWidth, align: 'right' });
      doc.fontSize(9).fillColor(gray).font('Helvetica')
        .text(`Invoice #: ${invoice.invoiceNumber}`, left, 78, { width: pageWidth, align: 'right' })
        .text(`Date: ${invoice.createdAt.toLocaleDateString('en-GB')}`, left, 91, { width: pageWidth, align: 'right' })
        .text(`Status: ${invoice.status.toUpperCase()}`, left, 104, { width: pageWidth, align: 'right' });

      doc.moveTo(left, 130).lineTo(left + pageWidth, 130).strokeColor(lightBorder).stroke();

      // Billed to
      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold').text('BILLED TO', left, 150);
      doc.fontSize(11).fillColor(dark).font('Helvetica-Bold').text(invoice.customer.fullName, left, 164);
      doc.fontSize(10).fillColor(gray).font('Helvetica').text(invoice.customer.email, left, 180);

      // Items table
      let y = 220;
      const col1 = left; // service
      const col2 = left + pageWidth * 0.5; // tier
      const col3 = left + pageWidth * 0.72; // qty (always 1, but keeps layout standard)
      const col4 = left + pageWidth * 0.85; // amount

      doc.rect(left, y, pageWidth, 24).fill('#f8fafc');
      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold')
        .text('SERVICE', col1 + 8, y + 8)
        .text('TIER', col2, y + 8)
        .text('QTY', col3, y + 8)
        .text('AMOUNT', col4, y + 8, { width: left + pageWidth - col4 - 8, align: 'right' });
      y += 24;

      if (invoice.order?.items?.length) {
        for (const item of invoice.order.items) {
          const rowHeight = 26;
          doc.fontSize(10).fillColor(dark).font('Helvetica')
            .text(item.name, col1 + 8, y + 8, { width: col2 - col1 - 16 })
            .text(item.tier, col2, y + 8, { width: col3 - col2 })
            .text('1', col3, y + 8, { width: col4 - col3 })
            .text(`£${Number(item.price).toFixed(2)}`, col4, y + 8, {
              width: left + pageWidth - col4 - 8,
              align: 'right',
            });
          doc.moveTo(left, y + rowHeight).lineTo(left + pageWidth, y + rowHeight)
            .strokeColor(lightBorder).stroke();
          y += rowHeight;
        }
      } else {
        doc.fontSize(10).fillColor(dark).font('Helvetica')
          .text('Service charge', col1 + 8, y + 8, { width: col2 - col1 - 16 })
          .text(`£${Number(invoice.amount).toFixed(2)}`, col4, y + 8, {
            width: left + pageWidth - col4 - 8,
            align: 'right',
          });
        doc.moveTo(left, y + 26).lineTo(left + pageWidth, y + 26).strokeColor(lightBorder).stroke();
        y += 26;
      }

      y += 20;

      // Total box, right-aligned
      const totalBoxWidth = 220;
      const totalBoxX = left + pageWidth - totalBoxWidth;
      doc.fontSize(10).fillColor(gray).font('Helvetica')
        .text('Total due', totalBoxX, y, { width: totalBoxWidth - 90 });
      doc.fontSize(16).fillColor(brand).font('Helvetica-Bold')
        .text(`£${Number(invoice.amount).toFixed(2)}`, totalBoxX, y - 3, {
          width: totalBoxWidth,
          align: 'right',
        });

      y += 40;

      if (invoice.notes) {
        doc.fontSize(9).fillColor(gray).font('Helvetica')
          .text(invoice.notes, left, y, { width: pageWidth });
        y += 30;
      }

      // Footer
      const footerY = doc.page.height - doc.page.margins.bottom - 30;
      doc.moveTo(left, footerY).lineTo(left + pageWidth, footerY).strokeColor(lightBorder).stroke();
      doc.fontSize(8).fillColor(gray).font('Helvetica')
        .text(
          'Interquark Ltd — registered in England and Wales — hello@interquark.co.uk',
          left,
          footerY + 10,
          { width: pageWidth, align: 'center' },
        );

      doc.end();
    });
  }

  private async nextInvoiceNumber() {
    const count = await this.repo.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Wraps invoice creation with a few retries — if two orders get
  // created close together, both can read the same count() before
  // either saves, producing a duplicate invoiceNumber. Catching the
  // unique-constraint violation and regenerating a fresh number is a
  // simple, effective fix without needing a dedicated DB sequence.
  private async createWithRetry(
    buildInvoice: (invoiceNumber: string) => Promise<Invoice>,
    attempts = 5,
  ): Promise<Invoice> {
    for (let i = 0; i < attempts; i++) {
      const invoiceNumber = await this.nextInvoiceNumber();
      try {
        return await buildInvoice(invoiceNumber);
      } catch (err: any) {
        const isDuplicate = err?.code === '23505'; // Postgres unique_violation
        if (!isDuplicate || i === attempts - 1) throw err;
        // otherwise loop and try again with a freshly generated number
      }
    }
    throw new Error('Could not generate a unique invoice number.');
  }

  async create(dto: CreateInvoiceDto) {
    const customer = await this.usersRepo.findOne({ where: { id: dto.customerId as any } });
    if (!customer) throw new NotFoundException('Customer not found.');

    let order: Order | null = null;
    if (dto.orderId) {
      order = await this.ordersRepo.findOne({ where: { id: dto.orderId as any } });
      if (!order) throw new NotFoundException('Order not found.');
    }

    return this.createWithRetry(async (invoiceNumber) => {
      const invoice = this.repo.create({
        invoiceNumber,
        customer,
        order,
        amount: dto.amount,
        status: dto.status ?? InvoiceStatus.DRAFT,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes,
      });
      return this.repo.save(invoice);
    });
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
