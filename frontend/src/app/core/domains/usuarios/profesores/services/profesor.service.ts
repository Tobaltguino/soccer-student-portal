import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Profesor, ActualizarProfesorPayload } from '../models/profesor.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfesorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/profesores`;

  /**
   * GET /profesores
   * Lista todos los registros de la tabla profesores (Solo Administrador).
   */
  listarProfesores(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(this.apiUrl);
  }

  /**
   * GET /profesores/:id
   * Obtiene el registro de profesor por su usuario_id (Solo Administrador).
   */
  obtenerProfesorPorId(usuarioId: string): Observable<Profesor> {
    return this.http.get<Profesor>(`${this.apiUrl}/${usuarioId}`);
  }

  /**
   * PATCH /profesores/:id
   * Actualiza el tipo de profesor (Solo Administrador).
   */
  actualizarProfesor(usuarioId: string, payload: ActualizarProfesorPayload): Observable<Profesor> {
    return this.http.patch<Profesor>(`${this.apiUrl}/${usuarioId}`, payload);
  }
}