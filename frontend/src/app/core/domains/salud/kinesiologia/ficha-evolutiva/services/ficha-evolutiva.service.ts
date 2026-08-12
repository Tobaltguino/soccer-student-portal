import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { 
  FichaEvolutiva, 
  CrearFichaPayload, 
  ActualizarFichaPayload 
} from '../models/ficha-evolutiva.interface';

@Injectable({
  providedIn: 'root'
})
export class FichaEvolutivaService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * POST /kine-fichas-evolutivas
   * Crea una nueva ficha evolutiva para un estudiante (Solo Kinesiólogo o Admin).
   */
  crearFicha(payload: CrearFichaPayload): Observable<FichaEvolutiva> {
    return this.http.post<FichaEvolutiva>(`${this.baseUrl}/kine-fichas-evolutivas`, payload);
  }

  /**
   * GET /estudiantes/me/fichas-evolutivas
   * Lista el historial de fichas del estudiante autenticado.
   */
  listarMisFichas(): Observable<FichaEvolutiva[]> {
    return this.http.get<FichaEvolutiva[]>(`${this.baseUrl}/estudiantes/me/fichas-evolutivas`);
  }

  /**
   * GET /estudiantes/:estudianteId/fichas-evolutivas
   * Lista el historial de fichas de un estudiante específico.
   */
  listarFichasPorEstudiante(estudianteId: string): Observable<FichaEvolutiva[]> {
    return this.http.get<FichaEvolutiva[]>(`${this.baseUrl}/estudiantes/${estudianteId}/fichas-evolutivas`);
  }

  /**
   * GET /kine-fichas-evolutivas/:id
   * Obtiene el detalle completo de una ficha específica.
   */
  obtenerFichaPorId(id: string): Observable<FichaEvolutiva> {
    return this.http.get<FichaEvolutiva>(`${this.baseUrl}/kine-fichas-evolutivas/${id}`);
  }

  /**
   * PATCH /kine-fichas-evolutivas/:id
   * Actualiza los campos de una ficha existente.
   */
  actualizarFicha(id: string, payload: ActualizarFichaPayload): Observable<FichaEvolutiva> {
    return this.http.patch<FichaEvolutiva>(`${this.baseUrl}/kine-fichas-evolutivas/${id}`, payload);
  }

  /**
   * DELETE /kine-fichas-evolutivas/:id
   * Elimina lógicamente (soft-delete) una ficha.
   */
  eliminarFicha(id: string): Observable<FichaEvolutiva> {
    return this.http.delete<FichaEvolutiva>(`${this.baseUrl}/kine-fichas-evolutivas/${id}`);
  }

  /**
   * PATCH /kine-fichas-evolutivas/:id/restaurar
   * Restaura una ficha eliminada previamente.
   */
  restaurarFicha(id: string): Observable<FichaEvolutiva> {
    return this.http.patch<FichaEvolutiva>(`${this.baseUrl}/kine-fichas-evolutivas/${id}/restaurar`, {});
  }
}