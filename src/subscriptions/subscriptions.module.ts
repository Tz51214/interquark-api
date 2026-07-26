import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionActiveGuard } from '../auth/guards/subscription-active.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User]), LedgerModule, EmailModule, UsersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionActiveGuard],
  exports: [TypeOrmModule, SubscriptionsService, SubscriptionActiveGuard],
})
export class SubscriptionsModule {}
