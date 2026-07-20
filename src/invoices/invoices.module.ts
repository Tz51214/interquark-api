import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, User, Order])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
