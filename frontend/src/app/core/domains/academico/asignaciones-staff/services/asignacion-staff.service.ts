import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AsignacionStaff, AsignarStaffPayload, TipoStaff } from '../models/asignacion-staff.interface';

@Injectable({
  providedIn: 'root'
})
export class AsignacionStaffService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/grupos`;

  /**
   * POST /grupos/:grupoId/:tipoStaff
   * Asigna un profesional (Profesor, Kinesiólogo, Nutricionista) a un grupo.
   */
  asignarStaff(grupoId: number, tipo: TipoStaff, payload: AsignarStaffPayload): Observable<AsignacionStaff> {
    return this.http.post<AsignacionStaff>(`${this.apiUrl}/${grupoId}/${tipo}`, payload);
  }

  /**
   * DELETE /grupos/:grupoId/:tipoStaff/:usuarioId
   * Remueve la asignación de un profesional en un grupo.
   */
  desasignarStaff(grupoId: number, tipo: TipoStaff, usuarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${grupoId}/${tipo}/${usuarioId}`);
  }

  /**
   * GET /grupos/:grupoId/:tipoStaff
   * Lista los profesionales de un tipo específico asignados a un grupo.
   */
  listarStaffPorGrupo(grupoId: number, tipo: TipoStaff): Observable<AsignacionStaff[]> {
    return this.http.get<AsignacionStaff[]>(`${this.apiUrl}/${grupoId}/${tipo}`);
  }
}