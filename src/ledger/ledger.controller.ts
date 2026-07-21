import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LedgerService } from './ledger.service';
import { CreatePaymentRecordDto } from './dto/create-payment-record.dto';
import { UpdatePaymentRecordDto } from './dto/update-payment-record.dto';

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePaymentRecordDto) {
    return this.ledgerService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.ledgerService.findAll();
  }

  @Get('transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllTransactions() {
    return this.ledgerService.findAllTransactions();
  }

  @Get('by-order/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByOrder(@Param('orderId') orderId: string) {
    return this.ledgerService.findByOrder(orderId);
  }

  // New — powers "view billing history" on the admin Subscriptions tab.
  @Get('by-subscription/:subscriptionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findBySubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.ledgerService.findBySubscription(Number(subscriptionId));
  }

  @Get('mine')
  findMine(@Req() req: Request & { user: { userId: string } }) {
    return this.ledgerService.findMine(req.user.userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.ledgerService.findOne(id);
  }

  @Get(':id/receipt')
  async downloadReceipt(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string; role: string } },
    @Res() res: Response,
  ) {
    const pdf = await this.ledgerService.generateReceiptPdf(id, req.user.userId, req.user.role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
    });
    res.send(pdf);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePaymentRecordDto) {
    return this.ledgerService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.ledgerService.remove(id);
  }
}
