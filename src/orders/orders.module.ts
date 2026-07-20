import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { CreditMemosModule } from '../credit-memos/credit-memos.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Project, User]), InvoicesModule, CreditMemosModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
