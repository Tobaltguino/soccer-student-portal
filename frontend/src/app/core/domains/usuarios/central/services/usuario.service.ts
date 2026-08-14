import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { 
  UsuarioPerfilCompleto, 
  CrearUsuarioPayload, 
  ActualizarUsuarioPayload, 
  FiltrosUsuarios, 
  PaginacionUsuarios,
  UsuarioPerfil
} from '../models/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  /**
   * POST /usuarios
   * Crea un nuevo usuario y su perfil de rol (Solo Admin).
   */
  crearUsuario(payload: CrearUsuarioPayload): Observable<UsuarioPerfil> {
    return this.http.post<UsuarioPerfil>(this.apiUrl, payload);
  }

  /**
   * GET /usuarios
   * Lista todos los usuarios con filtros avanzados y paginación (Solo Admin).
   */
  listarUsuarios(filtros?: FiltrosUsuarios): Observable<PaginacionUsuarios> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.rol) params = params.set('rol', filtros.rol);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.activo !== undefined) params = params.set('activo', String(filtros.activo));
      if (filtros.pagina) params = params.set('pagina', filtros.pagina);
      if (filtros.limite) params = params.set('limite', filtros.limite);
      
      // El backend en NestJS usa .split(',') para arreglos
      if (filtros.grupoIds?.length) params = params.set('grupoIds', filtros.grupoIds.join(','));
      if (filtros.posiciones?.length) params = params.set('posiciones', filtros.posiciones.join(','));
      if (filtros.tipoProfesor?.length) params = params.set('tipoProfesor', filtros.tipoProfesor.join(','));
    }

    return this.http.get<PaginacionUsuarios>(this.apiUrl, { params });
  }

  /**
   * GET /usuarios/me
   * Obtiene el perfil completo del usuario autenticado.
   */
  obtenerMiPerfil(): Observable<UsuarioPerfilCompleto> {
    return this.http.get<UsuarioPerfilCompleto>(`${this.apiUrl}/me`);
  }

  /**
   * GET /usuarios/mi-equipo-tecnico
   * Obtiene profesores y kinesiólogos asociados al grupo del estudiante (Solo Estudiante).
   */
  obtenerMiEquipoTecnico(): Observable<UsuarioPerfil[]> {
    return this.http.get<UsuarioPerfil[]>(`${this.apiUrl}/mi-equipo-tecnico`);
  }

  /**
   * GET /usuarios/:id
   * Obtiene el perfil completo de un usuario por su ID (Solo Admin).
   */
  obtenerUsuarioPorId(id: string): Observable<UsuarioPerfilCompleto> {
    return this.http.get<UsuarioPerfilCompleto>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /usuarios/:id
   * Actualiza la información de un usuario (Solo Admin).
   */
  actualizarUsuario(id: string, payload: ActualizarUsuarioPayload): Observable<UsuarioPerfil> {
    return this.http.patch<UsuarioPerfil>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * PATCH /usuarios/:id/desactivar
   * Desactiva un usuario (soft-delete lógico) (Solo Admin).
   */
  desactivarUsuario(id: string): Observable<UsuarioPerfil> {
    return this.http.patch<UsuarioPerfil>(`${this.apiUrl}/${id}/desactivar`, {});
  }

  /**
   * PATCH /usuarios/:id/reactivar
   * Reactiva un usuario desactivado (Solo Admin).
   */
  reactivarUsuario(id: string): Observable<UsuarioPerfil> {
    return this.http.patch<UsuarioPerfil>(`${this.apiUrl}/${id}/reactivar`, {});
  }

  /**
   * DELETE /usuarios/:id
   * Elimina permanentemente a un usuario si no tiene historial (Solo Admin).
   */
  eliminarUsuario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * PATCH /usuarios/:id/foto
   * Sube o actualiza la foto de perfil de un usuario usando FormData.
   */
  actualizarFoto(id: string, foto: File): Observable<{ fotoUrl: string }> {
    const formData = new FormData();
    formData.append('foto', foto); 
    // El nombre 'foto' debe coincidir con el FileInterceptor('foto') del backend

    // HttpClient deduce automáticamente los headers multipart/form-data
    return this.http.patch<{ fotoUrl: string }>(`${this.apiUrl}/${id}/foto`, formData);
  }

  /**
   * DELETE /usuarios/:id/foto
   * Elimina la foto de perfil actual del usuario y deja el campo en null.
   */
  eliminarFoto(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/foto`);
  }
}