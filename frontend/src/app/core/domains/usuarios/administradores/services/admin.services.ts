import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Admin } from '../models/admin.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admins`;

  /**
   * GET /admins
   * Lista todos los registros de la tabla administradores.
   */
  listarAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.apiUrl);
  }

  /**
   * GET /admins/:id
   * Obtiene el registro de administrador por su usuario_id.
   */
  obtenerAdminPorId(usuarioId: string): Observable<Admin> {
    return this.http.get<Admin>(`${this.apiUrl}/${usuarioId}`);
  }
}