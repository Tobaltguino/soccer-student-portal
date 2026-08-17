import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  NutriSesion, 
  CrearNutriSesionPayload, 
  CambiarEstadoNutriSesionPayload, 
  FiltrosNutriSesiones, 
  PaginacionNutriSesiones 
} from '../models/sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class NutriSesionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nutri-evaluacion-sesiones`;

  /**
   * POST /nutri-evaluacion-sesiones
   * Crea una nueva sesión nutricional (Solo Admin o Nutricionista).
   */
  crearSesion(payload: CrearNutriSesionPayload): Observable<NutriSesion> {
    return this.http.post<NutriSesion>(this.apiUrl, payload);
  }

  /**
   * GET /nutri-evaluacion-sesiones
   * Lista las sesiones con paginación y filtros de fecha.
   */
  listarSesiones(filtros?: FiltrosNutriSesiones): Observable<PaginacionNutriSesiones> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
      if (filtros.incluirEliminadas !== undefined) params = params.set('incluirEliminadas', String(filtros.incluirEliminadas));
      if (filtros.pagina !== undefined) params = params.set('pagina', filtros.pagina.toString());
      if (filtros.limite !== undefined) params = params.set('limite', filtros.limite.toString());
    }

    return this.http.get<PaginacionNutriSesiones>(this.apiUrl, { params });
  }

  /**
   * GET /nutri-evaluacion-sesiones/:id
   * Busca el detalle de una sesión nutricional específica.
   */
  obtenerSesionPorId(id: string): Observable<NutriSesion> {
    return this.http.get<NutriSesion>(`${this.apiUrl}/${id}`);
  }

  /**
   * GET /nutri-evaluacion-sesiones/ultima-finalizada
   * Retorna la última sesión nutricional que haya concluido.
   */
  obtenerUltimaFinalizada(): Observable<any> {
    // Asegúrate de que apiUrl apunte a '.../nutri-evaluacion-sesiones'
    return this.http.get<any>(`${this.apiUrl}/ultima-finalizada`);
  }

  /**
   * PATCH /nutri-evaluacion-sesiones/:id
   * Actualiza los datos logísticos de la sesión
   */
  actualizarSesion(id: string, payload: any): Observable<NutriSesion> {
    return this.http.patch<NutriSesion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * PATCH /nutri-evaluacion-sesiones/:id/estado
   * Cambia el estado de la sesión (PROGRAMADA, EN_CURSO, FINALIZADA, CANCELADA).
   */
  cambiarEstado(id: string, payload: CambiarEstadoNutriSesionPayload): Observable<NutriSesion> {
    return this.http.patch<NutriSesion>(`${this.apiUrl}/${id}/estado`, payload);
  }

  /**
   * DELETE /nutri-evaluacion-sesiones/:id
   * Elimina lógicamente (soft-delete) una sesión nutricional.
   */
  eliminarSesion(id: string): Observable<NutriSesion> {
    return this.http.delete<NutriSesion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /nutri-evaluacion-sesiones/:id/restaurar
   * Restaura una sesión nutricional eliminada previamente.
   */
  restaurarSesion(id: string): Observable<NutriSesion> {
    return this.http.patch<NutriSesion>(`${this.apiUrl}/${id}/restaurar`, {});
  }
}