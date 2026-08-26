import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  HistorialClinico, 
  CrearHistorialPayload, 
  ActualizarHistorialPayload 
} from '../models/historial-clinico.interface';

@Injectable({
  providedIn: 'root'
})
export class HistorialClinicoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * POST /kine-historial-clinico
   * Crea un nuevo registro en el historial clínico de un estudiante (Solo Kine o Admin).
   */
  crearHistorial(payload: CrearHistorialPayload): Observable<HistorialClinico> {
    return this.http.post<HistorialClinico>(`${this.baseUrl}/kine-historial-clinico`, payload);
  }

  /**
   * GET /estudiantes/me/historial-clinico
   * Lista el historial clínico del estudiante autenticado.
   */
  listarMiHistorial(): Observable<HistorialClinico[]> {
    return this.http.get<HistorialClinico[]>(`${this.baseUrl}/estudiantes/me/historial-clinico`);
  }

  /**
   * GET /estudiantes/:estudianteId/historial-clinico
   * Lista el historial clínico de un estudiante específico (Kine o Admin).
   */
  listarHistorialPorEstudiante(estudianteId: string): Observable<HistorialClinico[]> {
    return this.http.get<HistorialClinico[]>(`${this.baseUrl}/estudiantes/${estudianteId}/historial-clinico`);
  }

  /**
 * GET /estudiantes/:estudianteId/estado-salud
 * Devuelve solo el estado de salud general del estudiante (sin diagnóstico
 * ni observaciones médicas). Pensado para roles no médicos como Profesor.
 */
  obtenerEstadoSalud(estudianteId: string): Observable<{ estado: string }> {
    return this.http.get<{ estado: string }>(`${this.baseUrl}/estudiantes/${estudianteId}/estado-salud`);
  }

  /**
   * GET /estado-salud-estudiantes
   * Devuelve un mapa { usuarioId: estado } con el estado de salud general
   * de todos los estudiantes dentro del alcance del usuario actual.
   */
  obtenerEstadoSaludGrupal(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.baseUrl}/estado-salud-estudiantes`);
  }

  /**
   * GET /kine-historial-clinico/:id
   * Obtiene el detalle de un registro de historial clínico específico.
   */
  obtenerHistorialPorId(id: number): Observable<HistorialClinico> {
    return this.http.get<HistorialClinico>(`${this.baseUrl}/kine-historial-clinico/${id}`);
  }

  /**
   * PATCH /kine-historial-clinico/:id
   * Actualiza el tipo, diagnóstico, estado u observaciones de un registro.
   */
  actualizarHistorial(id: number, payload: ActualizarHistorialPayload): Observable<HistorialClinico> {
    return this.http.patch<HistorialClinico>(`${this.baseUrl}/kine-historial-clinico/${id}`, payload);
  }

  /**
   * PATCH /kine-historial-clinico/:id/restaurar
   * Restaura un registro eliminado previamente.
   */
  restaurarHistorial(id: number): Observable<HistorialClinico> {
    return this.http.patch<HistorialClinico>(`${this.baseUrl}/kine-historial-clinico/${id}/restaurar`, {});
  }

  /**
   * DELETE /kine-historial-clinico/:id
   * Elimina lógicamente (soft-delete) un registro del historial.
   */
  eliminarHistorial(id: number): Observable<HistorialClinico> {
    return this.http.delete<HistorialClinico>(`${this.baseUrl}/kine-historial-clinico/${id}`);
  }

  /**
   * GET /kine-historial-clinico/stats
   * Obtiene la cantidad de pacientes en tratamiento, observación y reintegro
   */
  obtenerEstadisticasDashboard(): Observable<{enTratamiento: number, enObservacion: number, enReintegro: number}> {
    return this.http.get<any>(`${this.baseUrl}/stats`);
  }
}