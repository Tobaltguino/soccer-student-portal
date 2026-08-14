import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Grupo, CrearGrupoPayload, ActualizarGrupoPayload } from '../models/grupo.interface';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/grupos`;

  /**
   * GET /grupos
   * Lista los grupos permitidos para el usuario actual.
   */
  listarGrupos(incluirEliminados: boolean = false): Observable<Grupo[]> {
    let params = new HttpParams();
    
    if (incluirEliminados) {
      params = params.set('incluirEliminados', 'true');
    }

    return this.http.get<Grupo[]>(this.apiUrl, { params });
  }

  /**
   * GET /grupos/mis-grupos
   * Devuelve únicamente los grupos a los que el Staff (Profesor/Kine/Nutri) está asignado.
   */
  obtenerMisGrupos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(`${this.apiUrl}/mis-grupos`);
  }

  /**
   * GET /grupos/:id
   * Obtiene el detalle de un grupo específico.
   */
  obtenerGrupoPorId(id: number): Observable<Grupo> {
    return this.http.get<Grupo>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /grupos
   * Crea un nuevo grupo (Solo Administrador).
   */
  crearGrupo(payload: CrearGrupoPayload): Observable<Grupo> {
    return this.http.post<Grupo>(this.apiUrl, payload);
  }

  /**
   * PATCH /grupos/:id
   * Actualiza los datos de un grupo (Solo Administrador).
   */
  actualizarGrupo(id: number, payload: ActualizarGrupoPayload): Observable<Grupo> {
    return this.http.patch<Grupo>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /grupos/:id
   * Soft-delete de un grupo (Solo Administrador).
   */
  eliminarGrupo(id: number): Observable<Grupo> {
    return this.http.delete<Grupo>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /grupos/:id/restaurar
   * Restaura un grupo eliminado (Solo Administrador).
   */
  restaurarGrupo(id: number): Observable<Grupo> {
    return this.http.patch<Grupo>(`${this.apiUrl}/${id}/restaurar`, {});
  }
}