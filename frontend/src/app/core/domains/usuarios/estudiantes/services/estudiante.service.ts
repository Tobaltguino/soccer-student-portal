import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { 
  Estudiante, 
  EstudianteConPerfil, 
  ActualizarEstudiantePayload, 
  FiltrosEstudiantes, 
  PaginacionEstudiantes 
} from '../models/estudiante.interface';

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/estudiantes`;

  /**
   * GET /estudiantes
   * Lista estudiantes con sus perfiles de Auth/Central, aplicando filtros avanzados (Para Admin y Profesor).
   */
  listarEstudiantes(filtros?: FiltrosEstudiantes): Observable<PaginacionEstudiantes> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.activo !== undefined) params = params.set('activo', String(filtros.activo));
      if (filtros.pagina) params = params.set('pagina', filtros.pagina);
      if (filtros.limite) params = params.set('limite', filtros.limite);
      
      // Transformamos los arrays a strings separados por coma tal como lo espera el Transform de NestJS
      if (filtros.grupoIds?.length) params = params.set('grupoIds', filtros.grupoIds.join(','));
      if (filtros.posiciones?.length) params = params.set('posiciones', filtros.posiciones.join(','));
    }

    return this.http.get<PaginacionEstudiantes>(this.apiUrl, { params });
  }

  /**
   * GET /estudiantes/de-mi-grupo
   * Lista de manera rápida y sin paginación los estudiantes asignados a los grupos del usuario actual (Para Profesores y Kinesiólogos).
   */
  obtenerEstudiantesDeMiGrupo(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(`${this.apiUrl}/de-mi-grupo`);
  }

  /**
   * GET /estudiantes/:id
   * Obtiene la fila específica del estudiante por su ID de usuario.
   */
  obtenerEstudiantePorId(id: string): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /estudiantes/:id
   * Actualiza únicamente los campos específicos de la tabla estudiantes (Solo Admin).
   */
  actualizarEstudiante(id: string, payload: ActualizarEstudiantePayload): Observable<Estudiante> {
    return this.http.patch<Estudiante>(`${this.apiUrl}/${id}`, payload);
  }
}