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
import { SupportChatModule } from './support/support-chat.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LedgerModule } from './ledger/ledger.module';
import { TicketsModule } from './tickets/tickets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DevelopersModule } from './developers/developers.module';

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
      // Was `true` — fine for early local dev, dangerous in production
      // (can silently alter/drop columns on every restart to match
      // entities). Schema changes now go through migrations instead —
      // see src/data-source.ts and the migration:* npm scripts.
      synchronize: false,
    }),

    UsersModule,
    AuthModule,
    OrdersModule,
    SubscriptionsModule,
    ProjectsModule,
    PaymentsModule,
    EmailModule,
    MessagesModule,
    SupportChatModule,
    ProductsModule,
    InvoicesModule,
    LedgerModule,
    TicketsModule,
    NotificationsModule,
    DevelopersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
