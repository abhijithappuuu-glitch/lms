import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  userId: string;
  role: string;
  employeeId: string;
  departmentId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || (() => { throw new Error('JWT_SECRET is missing') })(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.userId) {
      throw new UnauthorizedException();
    }
    // We attach the minimal payload to the request object.
    // The robust validation of role/employee against the current DB state will happen inside guards/controllers.
    return payload;
  }
}
