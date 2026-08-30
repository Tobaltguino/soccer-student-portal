// --- web-auspiciador.service.ts ---
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebAuspiciador, CrearWebAuspiciadorPayload, ActualizarWebAuspiciadorPayload } from '../models/web-auspiciador.interface';

@Injectable({
  providedIn: 'root'
})
export class WebAuspiciadorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-auspiciadores`;

  listarAuspiciadores(): Observable<WebAuspiciador[]> {
    return this.http.get<WebAuspiciador[]>(this.apiUrl);
  }

  obtenerAuspiciadorPorId(id: number): Observable<WebAuspiciador> {
    return this.http.get<WebAuspiciador>(`${this.apiUrl}/${id}`);
  }

  crearAuspiciador(payload: CrearWebAuspiciadorPayload, imagen?: File): Observable<WebAuspiciador> {
    const formData = new FormData();
    formData.append('nombre', payload.nombre);
    if (payload.descripcion) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl) formData.append('instagramUrl', payload.instagramUrl);
    if (imagen) formData.append('imagen', imagen);

    return this.http.post<WebAuspiciador>(this.apiUrl, formData);
  }

  actualizarAuspiciador(id: number, payload: ActualizarWebAuspiciadorPayload, imagen?: File): Observable<WebAuspiciador> {
    const formData = new FormData();
    if (payload.nombre !== undefined) formData.append('nombre', payload.nombre);
    if (payload.descripcion !== undefined) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl !== undefined) formData.append('instagramUrl', payload.instagramUrl);
    if (imagen) formData.append('imagen', imagen);

    return this.http.patch<WebAuspiciador>(`${this.apiUrl}/${id}`, formData);
  }

  eliminarAuspiciador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  eliminarImagen(id: number): Observable<WebAuspiciador> {
    return this.http.delete<WebAuspiciador>(`${this.apiUrl}/${id}/imagen`);
  }
}