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

  async signIn(email: string, password: string) {
    return await this.supabaseService.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabaseService.client.auth.signOut();
  }

  async recuperarPassword(email: string) {
    return await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
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
      // El cuerpo de la respuesta trae el mensaje de validación del servidor
      const detalle = await error.context?.json?.().catch(() => null);
      throw new Error(detalle?.error || 'No se pudo actualizar la contraseña.');
    }
    if (data?.error) throw new Error(data.error);
  }

  /**
   * Llama a la función segura (RPC) en Supabase para obtener el correo mediante el RUT.
   */
  async obtenerCorreoPorRut(rut: string) {
    return await this.supabaseService.client.rpc('obtener_correo_por_rut', { p_rut: rut });
  }
}