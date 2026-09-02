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
  private readonly supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabaseAnon = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );

    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async login(dto: LoginDto) {
    // 1. Buscar el email del usuario usando el RUT proporcionado
    const { data: perfil, error: perfilError } = await this.supabaseAdmin
      .from('usuarios_perfiles')
      .select('email, rol')
      .eq('rut', dto.rut)
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

    // ✨ 3. VERIFICACIÓN DE TÉRMINOS Y CONDICIONES
    const VERSION_ACTUAL_TERMINOS = '1.0';
    const VERSION_ACTUAL_POLITICA = '1.0';

    const { data: aceptaciones, error: errorAceptacion } = await this.supabaseAdmin
      .from('aceptaciones_legales')
      .select('usuario_id') // 🔥 AQUÍ ESTÁ EL CAMBIO: Pedimos usuario_id en vez de id
      .eq('usuario_id', data.user.id)
      .eq('version_terminos', VERSION_ACTUAL_TERMINOS)
      .eq('version_politica', VERSION_ACTUAL_POLITICA)
      .limit(1);

    if (errorAceptacion) {
      console.error('== ERROR BUSCANDO TÉRMINOS ==', errorAceptacion);
    }

    const necesitaAceptarTerminos = !aceptaciones || aceptaciones.length === 0;

    // 4. Retornar el token y los datos consolidados
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        rut: dto.rut, 
        role: perfil.rol, 
        necesitaAceptarTerminos, // <--- Enviamos la instrucción al frontend
      },
    };
  }

  async recuperarPassword(dto: RecuperarPasswordDto) {
    const { data: perfil, error: perfilError } = await this.supabaseAdmin
      .from('usuarios_perfiles')
      .select('email')
      .eq('rut', dto.rut)
      .single();

    if (perfilError || !perfil) {
      throw new NotFoundException('El RUT ingresado no está registrado');
    }

    const { error } = await this.supabaseAnon.auth.resetPasswordForEmail(perfil.email, {
      redirectTo: this.configService.get<string>('FRONTEND_URL') || 'https://profutbol.netlify.app/update-password',
    });

    if (error) {
      console.error('Error enviando correo de recuperación:', error);
      throw new InternalServerErrorException('No se pudo enviar el correo de recuperación');
    }

    return { message: 'Si el RUT existe, se ha enviado un correo con las instrucciones' };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      password: dto.password,
    });

    if (error) {
      throw new InternalServerErrorException('No se pudo actualizar la contraseña');
    }

    await this.supabaseAdmin.auth.admin.signOut(userId);

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