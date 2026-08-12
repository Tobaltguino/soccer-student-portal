import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  NutriResultadoConDetalle, 
  CrearNutriResultadoPayload, 
  ActualizarNutriResultadoPayload 
} from '../models/resultado.interface';

@Injectable({
  providedIn: 'root'
})
export class NutriResultadoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * POST /nutri-evaluacion-resultados
   * Registra un nuevo resultado nutricional, soportando la subida opcional de un archivo (PDF/IMG).
   */
  crearResultado(payload: CrearNutriResultadoPayload, archivo?: File): Observable<NutriResultadoConDetalle> {
    const formData = new FormData();
    
    formData.append('evaluacionId', payload.evaluacionId);
    formData.append('estudianteId', payload.estudianteId);
    
    if (payload.observaciones) {
      formData.append('observaciones', payload.observaciones);
    }
    
    if (archivo) {
      formData.append('archivo', archivo);
    }

    return this.http.post<NutriResultadoConDetalle>(`${this.baseUrl}/nutri-evaluacion-resultados`, formData);
  }

  /**
   * GET /estudiantes/me/nutri-resultados
   * Lista los resultados nutricionales del estudiante autenticado (solo de sesiones FINALIZADAS).
   */
  listarMisResultados(): Observable<NutriResultadoConDetalle[]> {
    return this.http.get<NutriResultadoConDetalle[]>(`${this.baseUrl}/estudiantes/me/nutri-resultados`);
  }

  /**
   * GET /nutri-evaluacion-sesiones/:evaluacionId/resultados
   * Lista todos los resultados asociados a una sesión nutricional específica.
   */
  listarResultadosPorSesion(evaluacionId: string): Observable<NutriResultadoConDetalle[]> {
    return this.http.get<NutriResultadoConDetalle[]>(`${this.baseUrl}/nutri-evaluacion-sesiones/${evaluacionId}/resultados`);
  }

  /**
   * PATCH /nutri-evaluacion-resultados/:id
   * Actualiza las observaciones de un resultado o reemplaza el archivo adjunto.
   */
  actualizarResultado(id: string, payload: ActualizarNutriResultadoPayload, archivo?: File): Observable<NutriResultadoConDetalle> {
    const formData = new FormData();
    
    if (payload.observaciones !== undefined) {
      formData.append('observaciones', payload.observaciones);
    }
    
    if (archivo) {
      formData.append('archivo', archivo);
    }

    return this.http.patch<NutriResultadoConDetalle>(`${this.baseUrl}/nutri-evaluacion-resultados/${id}`, formData);
  }

  /**
   * DELETE /nutri-evaluacion-resultados/:id
   * Elimina permanentemente un resultado y su archivo asociado del bucket (Solo Admin).
   */
  eliminarResultado(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/nutri-evaluacion-resultados/${id}`);
  }
}