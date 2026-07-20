import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { RefundSubscriptionDto } from './dto/refund-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.subscriptionsService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(+id, updateSubscriptionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(+id);
  }

  // New — apply a discount/coupon.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/discount')
  applyDiscount(@Param('id') id: string, @Body() dto: ApplyDiscountDto) {
    return this.subscriptionsService.applyDiscount(+id, dto);
  }

  // New — force-cancel for disputes/edge cases.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/cancel')
  forceCancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.forceCancel(+id, dto);
  }

  // New — issue a refund (creates a ledger entry).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundSubscriptionDto) {
    return this.subscriptionsService.refund(+id, dto);
  }

  // New — full billing history for one subscription.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/billing-history')
  billingHistory(@Param('id') id: string) {
    return this.subscriptionsService.billingHistory(+id);
  }
}
