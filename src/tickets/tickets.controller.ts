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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get('mine')
  findMine(@Req() req: Request & { user: { userId: string } }) {
    return this.ticketsService.findMine(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
