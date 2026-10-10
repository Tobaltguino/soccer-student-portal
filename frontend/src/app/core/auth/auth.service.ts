import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { LoginCredentials, AuthResponse } from '../models/auth.interface'; 
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  // La ruta base ya incluye '/auth'
  private apiUrl = `${environment.apiUrl}/auth`; 

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        // Guardamos los tokens y el rol
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('user_role', response.user.role);
        
        // Opcional: Podrías guardar si necesita términos en el storage por si refresca la página
        localStorage.setItem('necesita_terminos', String(response.user.necesitaAceptarTerminos));
      })
    );
  }

  // ✨ Unifiqué getMe() y me() en uno solo, y corregí la URL
  me(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/me`, {}); 
  }

  // Corregida la URL duplicada (quitamos el /auth/ extra)
  recuperarPassword(rut: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/recuperar-password`, { rut });
  }

  updatePassword(password: string) {
    // Si en NestJS lo dejaste como @Patch, cambia este .post por .patch
    return this.http.post<{ message: string }>(`${this.apiUrl}/update-password`, { password });
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
      })
    );
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('necesita_terminos'); // Limpiamos también esto
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }
}