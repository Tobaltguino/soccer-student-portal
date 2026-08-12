import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AceptacionLegal, AceptarTerminosPayload } from '../models/aceptacion-legal.interface';

@Injectable({
  providedIn: 'root'
})
export class AceptacionLegalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/aceptaciones-legales`;

  /**
   * POST /aceptaciones-legales
   * Registra o actualiza la aceptación de los términos y condiciones del usuario autenticado.
   * La IP se captura automáticamente en el backend.
   */
  aceptarTerminos(payload: AceptarTerminosPayload): Observable<AceptacionLegal> {
    return this.http.post<AceptacionLegal>(this.apiUrl, payload);
  }

  /**
   * GET /aceptaciones-legales/me
   * Consulta el registro de aceptación legal del usuario autenticado.
   * Retorna null si el usuario aún no ha aceptado los términos.
   */
  obtenerMiAceptacion(): Observable<AceptacionLegal | null> {
    return this.http.get<AceptacionLegal | null>(`${this.apiUrl}/me`);
  }
}