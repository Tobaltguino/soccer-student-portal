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

  async signIn(email: string, password: string) {
    return await this.supabaseService.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabaseService.client.auth.signOut();
  }
}