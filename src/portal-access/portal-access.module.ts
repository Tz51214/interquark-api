import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalAccessController } from './portal-access.controller';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Order])],
  controllers: [PortalAccessController],
})
export class PortalAccessModule {}
