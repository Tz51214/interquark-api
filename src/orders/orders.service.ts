import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { EmailService } from '../email/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreditMemosService } from '../credit-memos/credit-memos.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly invoicesService: InvoicesService,
    private readonly creditMemosService: CreditMemosService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    const totalAmount = dto.items.reduce((sum, item) => sum + Number(item.price), 0);

    const order = this.ordersRepository.create({
      customer: { id: userId } as User,
      totalAmount,
      status: OrderStatus.PENDING,
      items: dto.items.map((item) =>
        this.orderItemsRepository.create({
          sku: item.sku,
          name: item.name,
          tier: item.tier,
          price: item.price,
        }),
      ),
    });

    const savedOrder = await this.ordersRepository.save(order);

    const project = this.projectsRepository.create({
      order: savedOrder,
      freelancer: null,
    });
    await this.projectsRepository.save(project);

    // New — every order gets an invoice immediately, starting as SENT.
    // A webhook/payment-success handler flips it to PAID once payment
    // actually completes.
    await this.invoicesService.create({
      customerId: String(userId),
      orderId: String(savedOrder.id),
      amount: totalAmount,
      status: InvoiceStatus.SENT,
    });

    // New — send an order confirmation email. Fetched separately since
    // savedOrder.customer only has { id: userId }, not the full record.
    const customer = await this.usersRepository.findOne({ where: { id: userId } });
    if (customer) {
      const itemNames = dto.items.map((i) => i.name).join(', ');
      await this.emailService.sendOrderConfirmation(
        customer.email,
        customer.fullName,
        itemNames,
        totalAmount,
      );
    }

    return savedOrder;
  }

  async findMyOrders(customerId: number) {
    return this.ordersRepository.find({
      where: { customer: { id: customerId } },
      relations: ['projects', 'projects.freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll() {
    return this.ordersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // New — admin action: issues a refund for an order. Creates a
  // formal credit memo, and marks both the order and its invoice as
  // REFUNDED so the customer sees a consistent picture across
  // orders, invoices, and credit memos.
  async refundOrder(id: number, reason: string) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!order) throw new NotFoundException('Order not found');

    // Actually returns money to the customer via Stripe/PayPal. If
    // this throws (no payment found, already refunded, etc.), nothing
    // below runs — we never want to mark something "refunded" in our
    // own records when the real money movement failed.
    await this.paymentsService.refundOrderPayment(id, Number(order.totalAmount), reason);

    const invoice = await this.invoicesService.findByOrder(String(id));

    const creditMemo = await this.creditMemosService.create({
      customerId: String(order.customer.id),
      orderId: String(order.id),
      invoiceId: invoice ? invoice.id : undefined,
      amount: Number(order.totalAmount),
      reason,
    });

    order.status = OrderStatus.REFUNDED;
    await this.ordersRepository.save(order);

    if (invoice) {
      await this.invoicesService.update(invoice.id, { status: InvoiceStatus.REFUNDED });
    }

    return creditMemo;
  }

  async remove(id: number) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['projects'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.projects && order.projects.length > 0) {
      await this.projectsRepository.remove(order.projects);
    }

    await this.ordersRepository.remove(order);
    return { message: 'Order deleted' };
  }
}
