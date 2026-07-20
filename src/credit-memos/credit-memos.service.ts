import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditMemo, CreditMemoStatus } from './entities/credit-memo.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { CreateCreditMemoDto } from './dto/create-credit-memo.dto';
import { UpdateCreditMemoDto } from './dto/update-credit-memo.dto';

@Injectable()
export class CreditMemosService {
  constructor(
    @InjectRepository(CreditMemo) private readonly repo: Repository<CreditMemo>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
  ) {}

  private async nextCreditMemoNumber() {
    const count = await this.repo.count();
    const year = new Date().getFullYear();
    return `CM-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateCreditMemoDto) {
    const customer = await this.usersRepo.findOne({ where: { id: dto.customerId as any } });
    if (!customer) throw new NotFoundException('Customer not found.');

    const order = await this.ordersRepo.findOne({ where: { id: dto.orderId as any } });
    if (!order) throw new NotFoundException('Order not found.');

    let invoice: Invoice | null = null;
    if (dto.invoiceId) {
      invoice = await this.invoicesRepo.findOne({ where: { id: dto.invoiceId as any } });
      if (!invoice) throw new NotFoundException('Invoice not found.');
    }

    const creditMemo = this.repo.create({
      creditMemoNumber: await this.nextCreditMemoNumber(),
      customer,
      order,
      invoice,
      amount: dto.amount,
      reason: dto.reason,
      status: CreditMemoStatus.PENDING,
    });
    return this.repo.save(creditMemo);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByOrder(orderId: string) {
    return this.repo.find({
      where: { order: { id: orderId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  findMine(customerId: string) {
    return this.repo.find({
      where: { customer: { id: customerId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const creditMemo = await this.repo.findOne({ where: { id } });
    if (!creditMemo) throw new NotFoundException('Credit memo not found.');
    return creditMemo;
  }

  async update(id: string, dto: UpdateCreditMemoDto) {
    const creditMemo = await this.findOne(id);

    if (
      dto.status === CreditMemoStatus.REFUNDED &&
      creditMemo.status !== CreditMemoStatus.REFUNDED
    ) {
      creditMemo.refundedAt = new Date();
    }
    if (dto.status) creditMemo.status = dto.status;
    if (dto.reason !== undefined) creditMemo.reason = dto.reason;

    return this.repo.save(creditMemo);
  }

  async remove(id: string) {
    const creditMemo = await this.findOne(id);
    await this.repo.remove(creditMemo);
    return { message: 'Credit memo deleted' };
  }
}
