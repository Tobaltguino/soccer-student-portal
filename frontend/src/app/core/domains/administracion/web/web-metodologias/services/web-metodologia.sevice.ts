import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  WebMetodologia, 
  CrearWebMetodologiaPayload, 
  ActualizarWebMetodologiaPayload 
} from '../models/web-metodologia.interface';

@Injectable({
  providedIn: 'root'
})
export class WebMetodologiaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-metodologias`;

  /**
   * GET /web-metodologias
   * Lista todas las metodologías ordenadas por el campo 'orden' (Público).
   */
  listarMetodologias(): Observable<WebMetodologia[]> {
    return this.http.get<WebMetodologia[]>(this.apiUrl);
  }

  /**
   * GET /web-metodologias/:id
   * Busca una metodología específica por su ID (Público).
   */
  obtenerMetodologiaPorId(id: number): Observable<WebMetodologia> {
    return this.http.get<WebMetodologia>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /web-metodologias
   * Crea una nueva metodología (Solo Admin).
   */
  crearMetodologia(payload: CrearWebMetodologiaPayload): Observable<WebMetodologia> {
    return this.http.post<WebMetodologia>(this.apiUrl, payload);
  }

  /**
   * PATCH /web-metodologias/:id
   * Actualiza una metodología existente (Solo Admin).
   */
  actualizarMetodologia(id: number, payload: ActualizarWebMetodologiaPayload): Observable<WebMetodologia> {
    return this.http.patch<WebMetodologia>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /web-metodologias/:id
   * Elimina completamente la metodología (Solo Admin).
   */
  eliminarMetodologia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}