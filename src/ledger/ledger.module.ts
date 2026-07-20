import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentRecord } from './entities/payment-record.entity';
import { User } from '../users/entities/user.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRecord, User, Invoice, Order, Subscription])],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
