import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Self-service — any signed-in user can view/update their own
  // notification preferences. Must be declared before @Get(':id') for
  // the same reason as the "online" route above.
  @UseGuards(JwtAuthGuard)
  @Get('me/notifications')
  getMyNotificationPreferences(@Req() req: any) {
    return this.usersService.getNotificationPreferences(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/referral')
  async getMyReferralCode(@Req() req: any) {
    const code = await this.usersService.getOrCreateReferralCode(req.user.userId);
    return { code };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notifications')
  updateMyNotificationPreferences(@Req() req: any, @Body() body: Record<string, boolean>) {
    return this.usersService.updateNotificationPreferences(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  // Must be declared before @Get(':id') — otherwise "online" gets
  // captured as an :id value instead of matching this route.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('online')
  findOnline() {
    return this.usersService.findOnline();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  // New — approve a freelancer's application.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/verify')
  verify(@Param('id') id: string) {
    return this.usersService.verify(+id);
  }

  // New — reject a freelancer's application.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.usersService.reject(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
