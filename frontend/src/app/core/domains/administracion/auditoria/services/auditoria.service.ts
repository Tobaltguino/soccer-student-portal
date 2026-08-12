import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Auditoria, FiltrosAuditoria, PaginacionAuditoria } from '../models/auditoria.interface';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auditoria`;

  /**
   * GET /auditoria
   * Lista el registro de acciones y eventos del sistema con paginación y filtros (Solo Administrador).
   */
  listarAuditoria(filtros?: FiltrosAuditoria): Observable<PaginacionAuditoria> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.usuarioId) params = params.set('usuarioId', filtros.usuarioId);
      if (filtros.metodo) params = params.set('metodo', filtros.metodo);
      if (filtros.ruta) params = params.set('ruta', filtros.ruta);
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
      if (filtros.pagina) params = params.set('pagina', filtros.pagina.toString());
      if (filtros.limite) params = params.set('limite', filtros.limite.toString());
    }

    return this.http.get<PaginacionAuditoria>(this.apiUrl, { params });
  }

  /**
   * GET /auditoria/:id
   * Busca el detalle exacto de un evento de auditoría específico (Solo Administrador).
   */
  obtenerAuditoriaPorId(id: number): Observable<Auditoria> {
    return this.http.get<Auditoria>(`${this.apiUrl}/${id}`);
  }
}