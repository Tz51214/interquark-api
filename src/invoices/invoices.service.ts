import { Injectable, NotFoundException } from '@nestjs/common';
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
