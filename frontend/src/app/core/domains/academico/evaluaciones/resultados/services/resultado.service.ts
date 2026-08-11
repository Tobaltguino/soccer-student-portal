import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  ResultadoConRango, 
  ResultadoConDetalle, 
  CrearResultadoPayload, 
  ActualizarResultadoPayload 
} from '../models/resultado.interface';

@Injectable({
  providedIn: 'root'
})
export class ResultadoEvaluacionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * POST /evaluaciones-resultados
   * Registra el resultado de un estudiante en una sesión.
   */
  crearResultado(payload: CrearResultadoPayload): Observable<ResultadoConRango> {
    return this.http.post<ResultadoConRango>(`${this.baseUrl}/evaluaciones-resultados`, payload);
  }

  /**
   * GET /evaluaciones-sesiones/:sesionId/resultados
   * Lista todos los resultados asociados a una sesión específica (Admin, Profe, Kine).
   */
  listarResultadosPorSesion(sesionId: string): Observable<ResultadoConRango[]> {
    return this.http.get<ResultadoConRango[]>(`${this.baseUrl}/evaluaciones-sesiones/${sesionId}/resultados`);
  }

  /**
   * GET /estudiantes/me/resultados
   * Lista los resultados del estudiante autenticado correspondientes a sesiones FINALIZADAS.
   */
  listarMisResultados(): Observable<ResultadoConDetalle[]> {
    return this.http.get<ResultadoConDetalle[]>(`${this.baseUrl}/estudiantes/me/resultados`);
  }

  /**
   * GET /estudiantes/:estudianteId/resultados
   * Lista el historial de resultados de un estudiante específico (Admin, Profe, Kine).
   */
  listarResultadosPorEstudiante(estudianteId: string): Observable<ResultadoConRango[]> {
    return this.http.get<ResultadoConRango[]>(`${this.baseUrl}/estudiantes/${estudianteId}/resultados`);
  }

  /**
   * PATCH /evaluaciones-resultados/:id
   * Actualiza el valor numérico u observación de un resultado.
   */
  actualizarResultado(id: number, payload: ActualizarResultadoPayload): Observable<ResultadoConRango> {
    return this.http.patch<ResultadoConRango>(`${this.baseUrl}/evaluaciones-resultados/${id}`, payload);
  }

  /**
   * DELETE /evaluaciones-resultados/:id
   * Elimina permanentemente un resultado.
   */
  eliminarResultado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/evaluaciones-resultados/${id}`);
  }
}