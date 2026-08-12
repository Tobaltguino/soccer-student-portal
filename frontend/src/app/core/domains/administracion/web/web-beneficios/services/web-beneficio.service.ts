// src/app/core/domains/administracion/web/web-beneficios/services/web-beneficio.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebBeneficio, CrearWebBeneficioPayload, ActualizarWebBeneficioPayload } from '../models/web-beneficio.interface';

@Injectable({
  providedIn: 'root'
})
export class WebBeneficioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-beneficios`;

  /**
   * GET /web-beneficios
   * Lista todos los beneficios ordenados por el campo 'orden' (Público).
   */
  listarBeneficios(): Observable<WebBeneficio[]> {
    return this.http.get<WebBeneficio[]>(this.apiUrl);
  }

  /**
   * GET /web-beneficios/:id
   * Busca un beneficio específico por su ID (Público).
   */
  obtenerBeneficioPorId(id: number): Observable<WebBeneficio> {
    return this.http.get<WebBeneficio>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /web-beneficios
   * Crea un beneficio. Soporta subida de imagen opcional mediante FormData (Solo Admin).
   */
  crearBeneficio(payload: CrearWebBeneficioPayload, imagen?: File): Observable<WebBeneficio> {
    const formData = new FormData();
    
    formData.append('nombre', payload.nombre);
    
    if (payload.descripcion) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl) formData.append('instagramUrl', payload.instagramUrl);
    
    // El backend espera la llave 'imagen'
    if (imagen) formData.append('imagen', imagen);

    return this.http.post<WebBeneficio>(this.apiUrl, formData);
  }

  /**
   * PATCH /web-beneficios/:id
   * Actualiza un beneficio existente. Soporta reemplazo de imagen mediante FormData (Solo Admin).
   */
  actualizarBeneficio(id: number, payload: ActualizarWebBeneficioPayload, imagen?: File): Observable<WebBeneficio> {
    const formData = new FormData();
    
    if (payload.nombre !== undefined) formData.append('nombre', payload.nombre);
    if (payload.descripcion !== undefined) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl !== undefined) formData.append('instagramUrl', payload.instagramUrl);
    
    if (imagen) formData.append('imagen', imagen);

    return this.http.patch<WebBeneficio>(`${this.apiUrl}/${id}`, formData);
  }

  /**
   * DELETE /web-beneficios/:id
   * Elimina completamente el beneficio y su imagen del bucket (Solo Admin).
   */
  eliminarBeneficio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * DELETE /web-beneficios/:id/imagen
   * Borra únicamente la imagen asociada a un beneficio (Solo Admin).
   */
  eliminarImagen(id: number): Observable<WebBeneficio> {
    return this.http.delete<WebBeneficio>(`${this.apiUrl}/${id}/imagen`);
  }
}