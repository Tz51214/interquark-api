import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev-secret-change-me',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    // Fire-and-forget — don't make every authenticated request wait on
    // this write. Powers the "Now Online" admin view.
    this.usersRepository
      .update({ id: payload.sub }, { lastActiveAt: new Date() })
      .catch(() => {
        // Non-critical — losing one activity ping isn't worth failing
        // the actual request over.
      });

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
