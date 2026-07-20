import { MessagesModule } from './messages/messages.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ProjectsModule } from './projects/projects.module';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { ContactModule } from './contact/contact.module';
import { SupportChatModule } from './support/support-chat.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LedgerModule } from './ledger/ledger.module';
import { TicketsModule } from './tickets/tickets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DevelopersModule } from './developers/developers.module';
import { CreditMemosModule } from './credit-memos/credit-memos.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: false,
    }),

    UsersModule,
    AuthModule,
    OrdersModule,
    SubscriptionsModule,
    ProjectsModule,
    PaymentsModule,
    EmailModule,
    ContactModule,
    MessagesModule,
    SupportChatModule,
    ProductsModule,
    InvoicesModule,
    LedgerModule,
    TicketsModule,
    NotificationsModule,
    DevelopersModule,
    CreditMemosModule,
    PayoutsModule,
    NewsletterModule,
    // Rate limiting: max 20 requests per 60 seconds per IP by default.
    // This is what actually stops someone from scripting thousands of
    // login attempts per second against /auth/login.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
