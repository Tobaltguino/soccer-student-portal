import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  WebPrograma, 
  CrearWebProgramaPayload, 
  ActualizarWebProgramaPayload 
} from '../models/web-programa.interface';

@Injectable({
  providedIn: 'root'
})
export class WebProgramaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-programas`;

  /**
   * GET /web-programas
   * Lista todos los programas ordenados por el campo 'orden' (Público).
   */
  listarProgramas(): Observable<WebPrograma[]> {
    return this.http.get<WebPrograma[]>(this.apiUrl);
  }

  /**
   * GET /web-programas/:id
   * Busca un programa específico por su ID (Público).
   */
  obtenerProgramaPorId(id: number): Observable<WebPrograma> {
    return this.http.get<WebPrograma>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /web-programas
   * Crea un nuevo programa (Solo Admin).
   */
  crearPrograma(payload: CrearWebProgramaPayload): Observable<WebPrograma> {
    return this.http.post<WebPrograma>(this.apiUrl, payload);
  }

  /**
   * PATCH /web-programas/:id
   * Actualiza un programa existente (Solo Admin).
   */
  actualizarPrograma(id: number, payload: ActualizarWebProgramaPayload): Observable<WebPrograma> {
    return this.http.patch<WebPrograma>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /web-programas/:id
   * Elimina completamente un programa (Solo Admin).
   */
  eliminarPrograma(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}