import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { RangoEvaluacion, CrearRangoPayload, ActualizarRangoPayload } from '../models/rango.interface';

@Injectable({
  providedIn: 'root'
})
export class RangoEvaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/evaluacion-rangos`;

  /**
   * POST /evaluacion-rangos
   * Crea un nuevo rango para un tipo de evaluación específico (Solo Administrador).
   */
  crearRango(payload: CrearRangoPayload): Observable<RangoEvaluacion> {
    return this.http.post<RangoEvaluacion>(this.apiUrl, payload);
  }

  /**
   * GET /evaluacion-rangos?tipoEvaluacionId=X
   * Lista todos los rangos asociados a un tipo de evaluación, ordenados por edad y valor.
   */
  listarRangosPorTipo(tipoEvaluacionId: number): Observable<RangoEvaluacion[]> {
    const params = new HttpParams().set('tipoEvaluacionId', tipoEvaluacionId.toString());
    return this.http.get<RangoEvaluacion[]>(this.apiUrl, { params });
  }

  /**
   * GET /evaluacion-rangos/:id
   * Busca un rango específico por su ID.
   */
  obtenerRangoPorId(id: number): Observable<RangoEvaluacion> {
    return this.http.get<RangoEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /evaluacion-rangos/:id
   * Actualiza los valores, edades o colores de un rango (Solo Administrador).
   */
  actualizarRango(id: number, payload: ActualizarRangoPayload): Observable<RangoEvaluacion> {
    return this.http.patch<RangoEvaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /evaluacion-rangos/:id
   * Elimina un rango de la base de datos (Solo Administrador).
   */
  eliminarRango(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}