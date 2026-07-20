import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.newsletterService.findAll();
  }
}
