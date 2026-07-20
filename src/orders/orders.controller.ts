import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.ordersService.findMyOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('all')
  findAll() {
    return this.ordersService.findAll();
  }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
remove(@Param('id') id: string) {
  return this.ordersService.remove(+id);
}

  // New — admin issues a refund: creates a credit memo, marks the
  // order and its invoice as REFUNDED.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/refund')
  refund(@Param('id') id: string, @Body('reason') reason: string) {
    return this.ordersService.refundOrder(+id, reason || 'Refunded by admin');
  }
}
