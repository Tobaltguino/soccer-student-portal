import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { 
  Material, 
  CrearMaterialPayload, 
  ActualizarMaterialPayload, 
  FiltrosMaterial, 
  PaginacionMaterial 
} from '../models/material.interface';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/material-complementario`;

  /**
   * POST /material-complementario
   * Sube un archivo a Supabase y crea el registro en la base de datos.
   */
  crearMaterial(payload: CrearMaterialPayload, archivo: File): Observable<Material> {
    const formData = new FormData();

    formData.append('archivo', archivo);
    formData.append('titulo', payload.titulo);
    formData.append('tipoMaterial', payload.tipoMaterial);

    if (payload.descripcion) {
      formData.append('descripcion', payload.descripcion);
    }
    if (payload.grupoId) {
      formData.append('grupoId', payload.grupoId.toString());
    }
    if (payload.claseId) {
      formData.append('claseId', payload.claseId.toString());
    }

    return this.http.post<Material>(this.apiUrl, formData);
  }

  /**
   * GET /material-complementario
   * Lista el material filtrado y paginado.
   */
  listarMaterial(filtros?: FiltrosMaterial): Observable<PaginacionMaterial> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.grupoId) params = params.set('grupoId', filtros.grupoId);
      if (filtros.claseId) params = params.set('claseId', filtros.claseId);
      if (filtros.tipoMaterial) params = params.set('tipoMaterial', filtros.tipoMaterial);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.pagina) params = params.set('pagina', filtros.pagina);
      if (filtros.limite) params = params.set('limite', filtros.limite);
    }

    return this.http.get<PaginacionMaterial>(this.apiUrl, { params });
  }

  /**
   * GET /material-complementario/:id
   */
  buscarMaterialPorId(id: string): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /material-complementario/:id
   * Actualiza metadatos del material y, opcionalmente, reemplaza el archivo físico.
   */
  actualizarMaterial(id: string, payload: ActualizarMaterialPayload, archivo?: File | null): Observable<Material> {
    if (archivo) {
      const formData = new FormData();
      formData.append('archivo', archivo);

      if (payload.titulo !== undefined) formData.append('titulo', payload.titulo);
      if (payload.descripcion !== undefined) formData.append('descripcion', payload.descripcion);
      if (payload.tipoMaterial !== undefined) formData.append('tipoMaterial', payload.tipoMaterial);
      if (payload.grupoId !== undefined) formData.append('grupoId', payload.grupoId.toString());
      if (payload.claseId !== undefined) formData.append('claseId', payload.claseId.toString());

      return this.http.patch<Material>(`${this.apiUrl}/${id}`, formData);
    }

    return this.http.patch<Material>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * DELETE /material-complementario/:id
   */
  eliminarMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}