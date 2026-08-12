import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { 
  KineResultadoConDetalle, 
  CrearKineResultadoPayload, 
  ActualizarKineResultadoPayload 
} from '../models/resultado.interface';

@Injectable({
  providedIn: 'root'
})
export class KineResultadoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * POST /kine-evaluaciones-resultados
   * Registra un nuevo resultado (único o por lados) para un estudiante en una sesión.
   */
  crearResultado(payload: CrearKineResultadoPayload): Observable<KineResultadoConDetalle> {
    return this.http.post<KineResultadoConDetalle>(`${this.baseUrl}/kine-evaluaciones-resultados`, payload);
  }

  /**
   * GET /estudiantes/me/kine-resultados
   * Lista los resultados del estudiante autenticado (solo de sesiones FINALIZADAS).
   */
  listarMisResultados(): Observable<KineResultadoConDetalle[]> {
    return this.http.get<KineResultadoConDetalle[]>(`${this.baseUrl}/estudiantes/me/kine-resultados`);
  }

  /**
   * GET /kine-evaluaciones-sesiones/:sesionId/resultados
   * Lista todos los resultados asociados a una sesión kinesiológica específica.
   */
  listarResultadosPorSesion(sesionId: string): Observable<KineResultadoConDetalle[]> {
    return this.http.get<KineResultadoConDetalle[]>(`${this.baseUrl}/kine-evaluaciones-sesiones/${sesionId}/resultados`);
  }

  /**
   * PATCH /kine-evaluaciones-resultados/:id
   * Actualiza el valor numérico, los lados u observación de un resultado.
   */
  actualizarResultado(id: number, payload: ActualizarKineResultadoPayload): Observable<KineResultadoConDetalle> {
    return this.http.patch<KineResultadoConDetalle>(`${this.baseUrl}/kine-evaluaciones-resultados/${id}`, payload);
  }

  /**
   * DELETE /kine-evaluaciones-resultados/:id
   * Elimina permanentemente un resultado.
   */
  eliminarResultado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/kine-evaluaciones-resultados/${id}`);
  }
}