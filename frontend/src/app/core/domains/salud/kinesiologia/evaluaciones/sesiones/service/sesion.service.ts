import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { 
  KineSesion, 
  CrearKineSesionPayload, 
  ActualizarKineSesionPayload, 
  CambiarEstadoKineSesionPayload, 
  FiltrosKineSesiones, 
  PaginacionKineSesiones 
} from '../models/sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineSesionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kine-evaluaciones-sesiones`;

  /**
   * POST /kine-evaluaciones-sesiones
   * Crea una nueva sesión de evaluación kinesiológica para un grupo (Admin, Kinesiólogo).
   */
  crearSesion(payload: CrearKineSesionPayload): Observable<KineSesion> {
    return this.http.post<KineSesion>(this.apiUrl, payload);
  }

  /**
   * GET /kine-evaluaciones-sesiones
   * Lista de sesiones con filtros y paginación (Admin, Kinesiólogo, Profesor).
   */
  listarSesiones(filtros?: FiltrosKineSesiones): Observable<PaginacionKineSesiones> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.grupoId !== undefined) params = params.set('grupoId', filtros.grupoId.toString());
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
      if (filtros.incluirEliminadas !== undefined) params = params.set('incluirEliminadas', String(filtros.incluirEliminadas));
      if (filtros.pagina !== undefined) params = params.set('pagina', filtros.pagina.toString());
      if (filtros.limite !== undefined) params = params.set('limite', filtros.limite.toString());
    }

    return this.http.get<PaginacionKineSesiones>(this.apiUrl, { params });
  }

  /**
   * GET /kine-evaluaciones-sesiones/:id
   * Busca el detalle de una sesión específica.
   */
  obtenerSesionPorId(id: string): Observable<KineSesion> {
    return this.http.get<KineSesion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /kine-evaluaciones-sesiones/:id
   * Actualiza datos generales (fecha u observación) de la sesión.
   */
  actualizarSesion(id: string, payload: ActualizarKineSesionPayload): Observable<KineSesion> {
    return this.http.patch<KineSesion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * PATCH /kine-evaluaciones-sesiones/:id/estado
   * Cambia el estado (PROGRAMADA, EN_CURSO, FINALIZADA, CANCELADA) de la sesión.
   */
  cambiarEstado(id: string, payload: CambiarEstadoKineSesionPayload): Observable<KineSesion> {
    return this.http.patch<KineSesion>(`${this.apiUrl}/${id}/estado`, payload);
  }

  /**
   * DELETE /kine-evaluaciones-sesiones/:id
   * Elimina lógicamente (soft-delete) una sesión (Solo Admin).
   */
  eliminarSesion(id: string): Observable<KineSesion> {
    return this.http.delete<KineSesion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /kine-evaluaciones-sesiones/:id/restaurar
   * Restaura una sesión eliminada previamente (Solo Admin).
   */
  restaurarSesion(id: string): Observable<KineSesion> {
    return this.http.patch<KineSesion>(`${this.apiUrl}/${id}/restaurar`, {});
  }
}