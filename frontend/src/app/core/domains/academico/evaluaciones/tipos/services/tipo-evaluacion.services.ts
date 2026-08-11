import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { TipoEvaluacion, CrearTipoEvaluacionPayload, ActualizarTipoEvaluacionPayload } from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class TipoEvaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tipo-evaluacion`;

  /**
   * POST /tipo-evaluacion
   * Crea una nueva plantilla o tipo de evaluación (Solo Administrador).
   */
  crearTipoEvaluacion(payload: CrearTipoEvaluacionPayload): Observable<TipoEvaluacion> {
    return this.http.post<TipoEvaluacion>(this.apiUrl, payload);
  }

  /**
   * GET /tipo-evaluacion
   * Lista todos los tipos de evaluación disponibles.
   */
  listarTiposEvaluacion(): Observable<TipoEvaluacion[]> {
    return this.http.get<TipoEvaluacion[]>(this.apiUrl);
  }

  /**
   * GET /tipo-evaluacion/:id
   * Busca un tipo de evaluación específico por su ID.
   */
  obtenerTipoEvaluacionPorId(id: number): Observable<TipoEvaluacion> {
    return this.http.get<TipoEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /tipo-evaluacion/:id
   * Actualiza los datos de un tipo de evaluación (Solo Administrador).
   */
  actualizarTipoEvaluacion(id: number, payload: ActualizarTipoEvaluacionPayload): Observable<TipoEvaluacion> {
    return this.http.patch<TipoEvaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /tipo-evaluacion/:id
   * Elimina un tipo de evaluación de la base de datos (Solo Administrador).
   */
  eliminarTipoEvaluacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}