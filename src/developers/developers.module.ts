import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeveloperProfile } from './entities/developer-profile.entity';
import { User } from '../users/entities/user.entity';
import { DevelopersService } from './developers.service';
import { DevelopersController } from './developers.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeveloperProfile, User]), SubscriptionsModule],
  controllers: [DevelopersController],
  providers: [DevelopersService],
  exports: [DevelopersService],
})
export class DevelopersModule {}
