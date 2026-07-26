import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Order } from '../orders/entities/order.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PayPalModule } from '../paypal/paypal.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { EmailModule } from '../email/email.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), SubscriptionsModule, PayPalModule, InvoicesModule, EmailModule, DiscountsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
