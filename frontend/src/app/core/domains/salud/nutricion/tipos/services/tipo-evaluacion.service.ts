import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  NutriTipoEvaluacion, 
  CrearNutriTipoEvaluacionPayload, 
  ActualizarNutriTipoEvaluacionPayload 
} from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class NutriTipoEvaluacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nutri-tipo-evaluacion`;

  /**
   * GET /nutri-tipo-evaluacion
   * Lista todos los tipos de evaluación nutricional.
   */
  listarTiposEvaluacion(): Observable<NutriTipoEvaluacion[]> {
    return this.http.get<NutriTipoEvaluacion[]>(this.apiUrl);
  }

  /**
   * GET /nutri-tipo-evaluacion/:id
   * Obtiene el detalle de un tipo de evaluación.
   */
  obtenerTipoEvaluacionPorId(id: string): Observable<NutriTipoEvaluacion> {
    return this.http.get<NutriTipoEvaluacion>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /nutri-tipo-evaluacion
   * Crea un nuevo tipo (Solo Admin).
   */
  crearTipoEvaluacion(payload: CrearNutriTipoEvaluacionPayload): Observable<NutriTipoEvaluacion> {
    return this.http.post<NutriTipoEvaluacion>(this.apiUrl, payload);
  }

  /**
   * PATCH /nutri-tipo-evaluacion/:id
   * Actualiza un tipo existente (Solo Admin).
   */
  actualizarTipoEvaluacion(id: string, payload: ActualizarNutriTipoEvaluacionPayload): Observable<NutriTipoEvaluacion> {
    return this.http.patch<NutriTipoEvaluacion>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /nutri-tipo-evaluacion/:id
   * Elimina un tipo (Solo Admin).
   */
  eliminarTipoEvaluacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}