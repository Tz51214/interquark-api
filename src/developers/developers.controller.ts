import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionActiveGuard } from '../auth/guards/subscription-active.guard';
import { DevelopersService } from './developers.service';
import { CreateDeveloperProfileDto } from './dto/create-developer-profile.dto';
import { UpdateDeveloperProfileDto } from './dto/update-developer-profile.dto';

@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  // Public — lets the site show a developer directory / portfolio pages
  // without requiring login.
  @Get()
  findAll() {
    return this.developersService.findAll();
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.developersService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.developersService.findOne(id);
  }

  // Requires an active subscription — this is the "start working"
  // moment for a freelancer, gated on having paid.
  @Post()
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  create(@Body() dto: CreateDeveloperProfileDto) {
    return this.developersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  update(@Param('id') id: string, @Body() dto: UpdateDeveloperProfileDto) {
    return this.developersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.developersService.remove(id);
  }
}
