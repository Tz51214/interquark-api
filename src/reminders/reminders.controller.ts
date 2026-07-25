import { Controller, Get, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('abandoned-carts')
  getAbandonedCarts() {
    return this.remindersService.listAbandonedCarts();
  }

  @Get('abandoned-signups')
  getAbandonedSignups() {
    return this.remindersService.listAbandonedSignups();
  }
}
