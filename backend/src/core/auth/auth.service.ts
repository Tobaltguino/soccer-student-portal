import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly supabaseAnon: SupabaseClient;
  private readonly supabaseAdmin: SupabaseClient; // Añadimos el cliente admin

  constructor(private configService: ConfigService) {
    // Cliente anónimo (para hacer el login simulando al frontend)
    this.supabaseAnon = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );

    // Cliente admin (para saltar el RLS y poder buscar el correo mediante el RUT)
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'), // Asegúrate de tener esta llave en tu .env
    );
  }

  async login(dto: LoginDto) {
    // 1. Buscar el email del usuario usando el RUT proporcionado
    const { data: perfil, error: perfilError } = await this.supabaseAdmin
      .from('usuarios_perfiles')
      .select('email, rol') // Traemos el email (y de paso el rol si lo necesitas)
      .eq('rut', dto.rut) // Asumiendo que tu DTO ahora recibe 'rut'
      .single();

    if (perfilError || !perfil) {
      console.log('== ERROR REAL DE SUPABASE ==', perfilError);
      throw new UnauthorizedException('El RUT ingresado no está registrado');
    }

    // 2. Hacer el login real contra Supabase usando el email encontrado
    const { data, error } = await this.supabaseAnon.auth.signInWithPassword({
      email: perfil.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // 3. Retornar el token y los datos consolidados
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        rut: dto.rut, // Podemos devolver el RUT
        role: perfil.rol, // Y el rol que encontramos en la tabla
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const { data, error } = await this.supabaseAnon.auth.refreshSession({
      refresh_token: dto.refresh_token,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  }

  async logout(accessToken: string) {
    const client = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
    await client.auth.signOut();
    return { message: 'Sesión cerrada' };
  }
}