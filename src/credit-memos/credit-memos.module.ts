import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditMemo } from './entities/credit-memo.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { CreditMemosService } from './credit-memos.service';
import { CreditMemosController } from './credit-memos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CreditMemo, User, Order, Invoice])],
  controllers: [CreditMemosController],
  providers: [CreditMemosService],
  exports: [CreditMemosService],
})
export class CreditMemosModule {}
