import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

const REFRESH_COOKIE = 'interquark_refresh';

// The frontend (interquark.co.uk) and backend (interquark-api.onrender.com)
// are genuinely different sites, not subdomains of one parent — so this
// cookie must be sent cross-site. That requires SameSite=None, which browsers
// only honor when Secure is also true (hence unconditional, not tied to
// NODE_ENV — if that var were ever unset, Secure:false + SameSite:None would
// cause every browser to silently reject the cookie). No domain attribute is
// set — the cookie stays scoped to this exact API host, which is all that's
// needed since only this API ever needs to read it back.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Stricter than the global default — 5 attempts per minute per IP,
  // since this endpoint is the actual target for brute-force attacks.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user, message } =
      await this.authService.login(loginDto);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    // Also returned directly in the body — the frontend stores this in
    // localStorage and sends it back explicitly on /auth/refresh,
    // since the cookie alone is unreliable across genuinely different
    // domains once a browser blocks third-party cookies (independent
    // of SameSite/Secure settings, which were already correct).
    return { message, accessToken, refreshToken, user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prefer the token sent explicitly in the body (localStorage) —
    // fall back to the cookie for any client still relying on it.
    const token = body?.refreshToken || req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No refresh token.');
    }

    const { accessToken, refreshToken, user } =
      await this.authService.refresh(token);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken, refreshToken, user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { message: 'Logged out' };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // New — admin-only. Kicks off impersonation and returns a one-time
  // URL to open in a new tab.
  @Post('login-as/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  loginAs(
    @Param('customerId') customerId: string,
    @Req() req: Request & { user: { userId: number } },
  ) {
    return this.authService.initiateLoginAs(req.user.userId, Number(customerId));
  }

  // New — public (no auth guard), since the whole point is this is
  // called by a browser tab that isn't signed in yet. The one-time
  // code itself is what authorizes this, not a bearer token.
  @Post('impersonate/redeem')
  async redeemImpersonation(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.redeemImpersonationCode(code);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken, user };
  }

  // New — admin-only audit log of every login-as action.
  @Get('login-as/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  loginAsLogs() {
    return this.authService.findLoginAsLogs();
  }
}
