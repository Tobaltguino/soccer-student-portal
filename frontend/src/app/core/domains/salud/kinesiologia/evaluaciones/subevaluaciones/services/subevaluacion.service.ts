import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { 
  KineSubevaluacion, 
  CrearKineSubevaluacionPayload, 
  ActualizarKineSubevaluacionPayload 
} from '../models/subevaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineSubevaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kine-subevaluaciones`;

  /**
   * GET /kine-subevaluaciones?tipoEvaluacionId=X
   * Lista todas las subevaluaciones asociadas a un tipo de evaluación específico.
   */
  listarSubevaluacionesPorTipo(tipoEvaluacionId: number): Observable<KineSubevaluacion[]> {
    const params = new HttpParams().set('tipoEvaluacionId', tipoEvaluacionId.toString());
    return this.http.get<KineSubevaluacion[]>(this.apiUrl, { params });
  }

  /**
   * GET /kine-subevaluaciones/:id
   * Busca el detalle de una subevaluación específica.
   */
  obtenerSubevaluacionPorId(id: number): Observable<KineSubevaluacion> {
    return this.http.get<KineSubevaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /kine-subevaluaciones
   * Crea una nueva subevaluación asignada a un tipo de evaluación (Solo Admin).
   */
  crearSubevaluacion(payload: CrearKineSubevaluacionPayload): Observable<KineSubevaluacion> {
    return this.http.post<KineSubevaluacion>(this.apiUrl, payload);
  }

  /**
   * PATCH /kine-subevaluaciones/:id
   * Actualiza el nombre, el estado de evalua_lados o la relación con el tipo de evaluación (Solo Admin).
   */
  actualizarSubevaluacion(id: number, payload: ActualizarKineSubevaluacionPayload): Observable<KineSubevaluacion> {
    return this.http.patch<KineSubevaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /kine-subevaluaciones/:id
   * Elimina permanentemente una subevaluación (Solo Admin).
   */
  eliminarSubevaluacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}