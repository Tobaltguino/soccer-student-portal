import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { 
  Clase, 
  CrearClasePayload, 
  ActualizarClasePayload, 
  PaginacionClases, 
  FiltrosClase 
} from '../models/clase.interface';

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clases`; // URL base para este controlador

  /**
   * GET /clases
   * Lista todas las clases permitidas para Admin, Profesor o Kine (paginadas)
   */
  listarClases(filtros?: FiltrosClase): Observable<PaginacionClases> {
    let params = new HttpParams();
    
    // Construimos los Query Params dinámicamente si existen
    if (filtros) {
      if (filtros.grupoId) params = params.set('grupoId', filtros.grupoId);
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
      if (filtros.incluirEliminadas) params = params.set('incluirEliminadas', filtros.incluirEliminadas);
      if (filtros.pagina) params = params.set('pagina', filtros.pagina);
      if (filtros.limite) params = params.set('limite', filtros.limite);
    }

    return this.http.get<PaginacionClases>(this.apiUrl, { params });
  }

  /**
   * GET /clases/mis-clases
   * Lista exclusiva para el rol Estudiante
   */
  obtenerMisClases(): Observable<Clase[]> {
    return this.http.get<Clase[]>(`${this.apiUrl}/mis-clases`);
  }

  /**
   * GET /clases/:id
   * Obtiene el detalle de una clase específica
   */
  obtenerClasePorId(id: number): Observable<Clase> {
    return this.http.get<Clase>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST /clases
   * Crea una nueva clase (Admin o Profesor)
   */
  crearClase(clase: CrearClasePayload): Observable<Clase> {
    return this.http.post<Clase>(this.apiUrl, clase);
  }

  /**
   * PATCH /clases/:id
   * Actualiza los datos de una clase existente
   */
  actualizarClase(id: number, clase: ActualizarClasePayload): Observable<Clase> {
    return this.http.patch<Clase>(`${this.apiUrl}/${id}`, clase);
  }

  /**
   * DELETE /clases/:id
   * Soft-delete de una clase (Solo Admin)
   */
  eliminarClase(id: number): Observable<Clase> {
    return this.http.delete<Clase>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /clases/:id/restaurar
   * Restaura una clase eliminada (Solo Admin)
   */
  restaurarClase(id: number): Observable<Clase> {
    return this.http.patch<Clase>(`${this.apiUrl}/${id}/restaurar`, {});
  }
}