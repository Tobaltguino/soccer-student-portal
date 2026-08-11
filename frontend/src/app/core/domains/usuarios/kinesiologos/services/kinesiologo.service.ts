import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Kinesiologo } from '../models/kinesiologo.interface';

@Injectable({
  providedIn: 'root'
})
export class KinesiologoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kinesiologos`;

  /**
   * GET /kinesiologos
   * Lista todos los registros de la tabla kinesiólogos (Solo Administrador).
   */
  listarKinesiologos(): Observable<Kinesiologo[]> {
    return this.http.get<Kinesiologo[]>(this.apiUrl);
  }

  /**
   * GET /kinesiologos/:id
   * Obtiene el registro de kinesiólogo por su usuario_id (Solo Administrador).
   */
  obtenerKinesiologoPorId(usuarioId: string): Observable<Kinesiologo> {
    return this.http.get<Kinesiologo>(`${this.apiUrl}/${usuarioId}`);
  }
}