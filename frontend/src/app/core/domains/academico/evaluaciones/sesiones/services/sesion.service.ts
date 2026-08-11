import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  SesionEvaluacion, 
  CrearSesionPayload, 
  ActualizarSesionPayload, 
  CambiarEstadoSesionPayload, 
  FiltrosSesiones, 
  PaginacionSesiones 
} from '../models/sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class SesionEvaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/evaluaciones-sesiones`;

  /**
   * POST /evaluaciones-sesiones
   * Crea una nueva sesión de evaluación para un grupo (Admin, Profesor).
   */
  crearSesion(payload: CrearSesionPayload): Observable<SesionEvaluacion> {
    return this.http.post<SesionEvaluacion>(this.apiUrl, payload);
  }

  /**
   * GET /evaluaciones-sesiones
   * Lista de sesiones con filtros y paginación (Admin, Profe, Kine).
   */
  listarSesiones(filtros?: FiltrosSesiones): Observable<PaginacionSesiones> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.grupoId) params = params.set('grupoId', filtros.grupoId.toString());
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
      if (filtros.incluirEliminadas !== undefined) params = params.set('incluirEliminadas', String(filtros.incluirEliminadas));
      if (filtros.pagina) params = params.set('pagina', filtros.pagina.toString());
      if (filtros.limite) params = params.set('limite', filtros.limite.toString());
    }

    return this.http.get<PaginacionSesiones>(this.apiUrl, { params });
  }

  /**
   * GET /evaluaciones-sesiones/:id
   * Busca el detalle de una sesión específica.
   */
  obtenerSesionPorId(id: string): Observable<SesionEvaluacion> {
    return this.http.get<SesionEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /evaluaciones-sesiones/:id
   * Actualiza datos generales de la sesión (Admin, Profesor).
   */
  actualizarSesion(id: string, payload: ActualizarSesionPayload): Observable<SesionEvaluacion> {
    return this.http.patch<SesionEvaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * PATCH /evaluaciones-sesiones/:id/estado
   * Cambia rápidamente el estado (PROGRAMADA, EN_CURSO, FINALIZADA) de la sesión.
   */
  cambiarEstado(id: string, payload: CambiarEstadoSesionPayload): Observable<SesionEvaluacion> {
    return this.http.patch<SesionEvaluacion>(`${this.apiUrl}/${id}/estado`, payload);
  }

  /**
   * DELETE /evaluaciones-sesiones/:id
   * Elimina lógicamente (soft-delete) una sesión (Solo Admin).
   */
  eliminarSesion(id: string): Observable<SesionEvaluacion> {
    return this.http.delete<SesionEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /evaluaciones-sesiones/:id/restaurar
   * Restaura una sesión eliminada previamente (Solo Admin).
   */
  restaurarSesion(id: string): Observable<SesionEvaluacion> {
    return this.http.patch<SesionEvaluacion>(`${this.apiUrl}/${id}/restaurar`, {});
  }
}