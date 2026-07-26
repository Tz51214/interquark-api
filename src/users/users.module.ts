import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { DiscountsModule } from '../discounts/discounts.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), DiscountsModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
