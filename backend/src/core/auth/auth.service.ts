import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RecuperarPasswordDto } from './dto/recuperar-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

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

  async recuperarPassword(dto: RecuperarPasswordDto) {
    // 1. Buscar el email del usuario usando el RUT proporcionado
    const { data: perfil, error: perfilError } = await this.supabaseAdmin
      .from('usuarios_perfiles')
      .select('email')
      .eq('rut', dto.rut)
      .single();

    if (perfilError || !perfil) {
      throw new NotFoundException('El RUT ingresado no está registrado');
    }

    // 2. Enviar el correo de recuperación mediante Supabase
    const { error } = await this.supabaseAnon.auth.resetPasswordForEmail(perfil.email, {
      redirectTo: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200/update-password',
    });

    if (error) {
      console.error('Error enviando correo de recuperación:', error);
      throw new InternalServerErrorException('No se pudo enviar el correo de recuperación');
    }

    return { message: 'Si el RUT existe, se ha enviado un correo con las instrucciones' };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    // 1. Actualizar la contraseña en Supabase usando el Admin API
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      password: dto.password,
    });

    if (error) {
      throw new InternalServerErrorException('No se pudo actualizar la contraseña');
    }

    // 2. Forzar el cierre de todas las sesiones antiguas por seguridad
    await this.supabaseAdmin.auth.admin.signOut(userId);

    // 3. Retornamos éxito. 
    // Tu Middleware/Interceptor de NestJS se encargará automáticamente de guardar la auditoría.
    return { message: 'Contraseña actualizada correctamente' };
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