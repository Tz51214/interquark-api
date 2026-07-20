import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreditMemosService } from './credit-memos.service';
import { CreateCreditMemoDto } from './dto/create-credit-memo.dto';
import { UpdateCreditMemoDto } from './dto/update-credit-memo.dto';

@Controller('credit-memos')
@UseGuards(JwtAuthGuard)
export class CreditMemosController {
  constructor(private readonly creditMemosService: CreditMemosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCreditMemoDto) {
    return this.creditMemosService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.creditMemosService.findAll();
  }

  @Get('by-order/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByOrder(@Param('orderId') orderId: string) {
    return this.creditMemosService.findByOrder(orderId);
  }

  // Any logged-in customer can see credit memos issued to them.
  @Get('mine')
  findMine(@Req() req: Request & { user: { userId: string } }) {
    return this.creditMemosService.findMine(req.user.userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.creditMemosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCreditMemoDto) {
    return this.creditMemosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.creditMemosService.remove(id);
  }
}
