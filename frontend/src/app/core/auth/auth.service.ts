import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { LoginCredentials, AuthResponse } from './auth.interface'; // Importación limpia
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user_role', response.user.role);
      })
    );
  }

  getMe(): Observable<any> {
    return this.http.post(`${this.apiUrl}/me`, {});
  }

  recuperarPassword(rut: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/recuperar-password`, { rut });
  }

  updatePassword(password: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/update-password`, { password });
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
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }
}