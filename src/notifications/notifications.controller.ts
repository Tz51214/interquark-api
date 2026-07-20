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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Typically called server-side by other modules (new order, new message,
  // etc.) rather than directly from the frontend, but exposed here too
  // for admin/testing use.
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get('mine')
  findMine(@Req() req: Request & { user: { userId: string } }) {
    return this.notificationsService.findMine(req.user.userId);
  }

  @Get('mine/unread-count')
  countUnread(@Req() req: Request & { user: { userId: string } }) {
    return this.notificationsService.countUnread(req.user.userId);
  }

  @Patch('mine/read-all')
  markAllRead(@Req() req: Request & { user: { userId: string } }) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
