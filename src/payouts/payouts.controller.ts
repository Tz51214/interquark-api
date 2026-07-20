import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePayoutDto) {
    return this.payoutsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.payoutsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.payoutsService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayoutDto) {
    return this.payoutsService.update(id, dto);
  }
}
