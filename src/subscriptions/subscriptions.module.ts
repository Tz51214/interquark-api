import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { SubscriptionActiveGuard } from '../auth/guards/subscription-active.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), LedgerModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionActiveGuard],
  exports: [TypeOrmModule, SubscriptionsService, SubscriptionActiveGuard],
})
export class SubscriptionsModule {}
