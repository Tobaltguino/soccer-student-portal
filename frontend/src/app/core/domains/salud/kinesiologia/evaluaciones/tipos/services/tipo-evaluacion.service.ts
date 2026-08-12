import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { 
  KineTipoEvaluacion, 
  CrearKineTipoEvaluacionPayload, 
  ActualizarKineTipoEvaluacionPayload 
} from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineTipoEvaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kine-tipos-evaluacion`;

  /**
   * GET /kine-tipos-evaluacion
   * Lista todos los tipos de evaluación kinesiológica disponibles.
   */
  listarTiposEvaluacion(): Observable<KineTipoEvaluacion[]> {
    return this.http.get<KineTipoEvaluacion[]>(this.apiUrl);
  }

  /**
   * GET /kine-tipos-evaluacion/:id
   * Busca un tipo de evaluación kinesiológica específico por su ID.
   */
  obtenerTipoEvaluacionPorId(id: number): Observable<KineTipoEvaluacion> {
    return this.http.get<KineTipoEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /kine-tipos-evaluacion
   * Crea un nuevo tipo de evaluación (Solo Administrador).
   */
  crearTipoEvaluacion(payload: CrearKineTipoEvaluacionPayload): Observable<KineTipoEvaluacion> {
    return this.http.post<KineTipoEvaluacion>(this.apiUrl, payload);
  }

  /**
   * PATCH /kine-tipos-evaluacion/:id
   * Actualiza los datos de un tipo de evaluación (Solo Administrador).
   */
  actualizarTipoEvaluacion(id: number, payload: ActualizarKineTipoEvaluacionPayload): Observable<KineTipoEvaluacion> {
    return this.http.patch<KineTipoEvaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /kine-tipos-evaluacion/:id
   * Elimina un tipo de evaluación de la base de datos (Solo Administrador).
   */
  eliminarTipoEvaluacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}