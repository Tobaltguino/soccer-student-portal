import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { 
  KineRango, 
  CrearKineRangoPayload, 
  ActualizarKineRangoPayload 
} from '../models/rango.interface';

@Injectable({
  providedIn: 'root'
})
export class KineRangoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kine-evaluacion-rangos`;

  /**
   * GET /kine-evaluacion-rangos?subevaluacionId=X
   * Lista todos los rangos (puntajes y colores) de una subevaluación específica.
   */
  listarRangosPorSubevaluacion(subevaluacionId: number): Observable<KineRango[]> {
    const params = new HttpParams().set('subevaluacionId', subevaluacionId.toString());
    return this.http.get<KineRango[]>(this.apiUrl, { params });
  }

  /**
   * GET /kine-evaluacion-rangos/:id
   * Busca el detalle de un rango específico.
   */
  obtenerRangoPorId(id: number): Observable<KineRango> {
    return this.http.get<KineRango>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /kine-evaluacion-rangos
   * Crea un nuevo rango o puntaje para una subevaluación (Solo Admin).
   */
  crearRango(payload: CrearKineRangoPayload): Observable<KineRango> {
    return this.http.post<KineRango>(this.apiUrl, payload);
  }

  /**
   * PATCH /kine-evaluacion-rangos/:id
   * Actualiza el puntaje, etiqueta, color o descripción de un rango (Solo Admin).
   */
  actualizarRango(id: number, payload: ActualizarKineRangoPayload): Observable<KineRango> {
    return this.http.patch<KineRango>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /kine-evaluacion-rangos/:id
   * Elimina permanentemente un rango (Solo Admin).
   */
  eliminarRango(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}