import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase';
import { AuthState, UserProfile } from './auth.interface';

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

  constructor(private supabaseService: SupabaseService) {
    this.initializeAuth();
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

  async updatePassword(newPassword: string) {
    return await this.supabaseService.client.auth.updateUser({
      password: newPassword
    });
  }
}