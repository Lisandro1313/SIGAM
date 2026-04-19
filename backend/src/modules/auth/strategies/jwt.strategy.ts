import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // Rechaza refresh tokens usados como Authorization Bearer.
    // Los tokens viejos (sin campo type) se aceptan por compat con sesiones previas.
    if (payload?.type === 'refresh') {
      throw new UnauthorizedException();
    }
    return await this.authService.validateUserById(payload.sub);
  }
}
