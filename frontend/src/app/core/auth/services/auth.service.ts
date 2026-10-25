import { Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase';
import { AuthState, UserProfile } from '../models/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Estado reactivo moderno con Angular Signals
  readonly authState = signal<AuthState>({
    user: null,
    session: null,
    isLoading: true
  });

  // Se resuelve cuando la sesión guardada ya fue restaurada (evita falsos "no logueado" al hacer F5)
  private readonly inicializado: Promise<void>;

  constructor(private supabaseService: SupabaseService) {
    this.inicializado = this.initializeAuth();
  }

  ready(): Promise<void> {
    return this.inicializado;
  }

  /**
   * true si el usuario aún usa la clave temporal (RUT) y debe cambiarla.
   * La marca vive en app_metadata, que el usuario no puede editar por su cuenta.
   */
  debeCambiarPassword(session: Session | null = this.authState().session): boolean {
    return session?.user?.app_metadata?.['debe_cambiar_password'] === true;
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    
    this.authState.set({
      user: session?.user ?? null,
      session: session,
      isLoading: false
    });

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.authState.set({
        user: session?.user ?? null,
        session: session,
        isLoading: false
      });
    });
  }

  /**
   * Obtiene la sesión actual directamente desde Supabase.
   */
  async obtenerSesionActual() {
    const { data, error } = await this.supabaseService.client.auth.getSession();
    if (error) {
      console.error('Error al obtener sesión:', error.message);
      return null;
    }
    return data.session;
  }

  /**
   * Obtiene el perfil público del usuario desde la tabla de perfiles.
   */
  async obtenerPerfilUsuario(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('usu_perfiles') // Verifica que el nombre coincida con tu tabla (ej: usu_perfiles o usuarios_perfiles)
      .select('*')
      .eq('id_usuario', userId)
      .single();

    if (error) {
      console.error('Error al obtener el perfil de usuario:', error.message);
      return null;
    }
    return data;
  }

  /**
   * scope 'local' solo limpia la sesión de este navegador (útil cuando el servidor
   * ya la invalidó, ej. tras cambiar la contraseña, y evita un 403 en consola).
   */
  async signOut(scope: 'global' | 'local' = 'global') {
    return await this.supabaseService.client.auth.signOut({ scope });
  }

  /**
   * Cambia la clave vía Edge Function: además quita la marca debe_cambiar_password
   * y rechaza usar el RUT como contraseña.
   */
  async cambiarPassword(nuevaPassword: string): Promise<void> {
    const { data, error } = await this.supabaseService.client.functions.invoke('cambiar-password', {
      body: { password: nuevaPassword }
    });

    if (error) {
      throw new Error(await this.mensajeErrorFuncion(error, 'No se pudo actualizar la contraseña.'));
    }
    if (data?.error) throw new Error(data.error);
  }

  /**
   * Login por RUT vía Edge Function: el servidor busca el correo y hace el login,
   * así el navegador nunca ve el correo de nadie. Devuelve la sesión ya activa.
   */
  async iniciarSesionConRut(rut: string, password: string): Promise<Session> {
    const { data, error } = await this.supabaseService.client.functions.invoke('auth-rut', {
      body: { accion: 'login', rut, password }
    });

    if (error || !data?.access_token) {
      throw new Error(await this.mensajeErrorFuncion(error, 'RUT o contraseña incorrectos.'));
    }

    const { data: sesionData, error: sesionError } = await this.supabaseService.client.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
    if (sesionError || !sesionData.session) throw new Error('No se pudo iniciar la sesión.');

    return sesionData.session;
  }

  /**
   * Envía el correo de recuperación del RUT indicado. La respuesta es la misma
   * exista o no el RUT (no revela quién está registrado).
   */
  async recuperarPasswordPorRut(rut: string): Promise<string> {
    const { data, error } = await this.supabaseService.client.functions.invoke('auth-rut', {
      body: { accion: 'recuperar', rut, redirectTo: `${window.location.origin}/update-password` }
    });

    if (error) throw new Error(await this.mensajeErrorFuncion(error, 'No se pudo procesar la solicitud.'));
    return data?.mensaje || 'Si el RUT está registrado, enviamos las instrucciones a su correo.';
  }

  /** functions.invoke solo dice "non-2xx"; el motivo real viene en el cuerpo ({ error }). */
  private async mensajeErrorFuncion(error: any, porDefecto: string): Promise<string> {
    const detalle = await error?.context?.json?.().catch(() => null);
    return detalle?.error || porDefecto;
  }
}