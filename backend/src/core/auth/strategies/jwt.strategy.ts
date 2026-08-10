// core/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { SupabaseService } from '../../supabase/supabase.service';
import { Rol } from '../../../shared/enums/rol.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RequestUser {
  id: string;
  email: string;
  rol: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        cacheMaxAge: 10 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const { data } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('rol')
      .eq('id_usuario', payload.sub)
      .single<{ rol: Rol }>();

    return {
      id: payload.sub,
      email: payload.email,
      rol: data?.rol ?? Rol.ESTUDIANTE, // fallback, no debería pasar en la práctica
    };
  }
}