import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebBeneficio, CrearWebBeneficioPayload, ActualizarWebBeneficioPayload } from '../models/web-beneficio.interface';

@Injectable({
  providedIn: 'root'
})
export class WebBeneficioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-beneficios`;

  listarBeneficios(): Observable<WebBeneficio[]> {
    return this.http.get<WebBeneficio[]>(this.apiUrl);
  }

  obtenerBeneficioPorId(id: number): Observable<WebBeneficio> {
    return this.http.get<WebBeneficio>(`${this.apiUrl}/${id}`);
  }

  crearBeneficio(payload: CrearWebBeneficioPayload, imagen?: File): Observable<WebBeneficio> {
    const formData = new FormData();
    formData.append('nombre', payload.nombre);
    if (payload.descripcion) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl) formData.append('instagramUrl', payload.instagramUrl);
    if (imagen) formData.append('imagen', imagen);

    return this.http.post<WebBeneficio>(this.apiUrl, formData);
  }

  actualizarBeneficio(id: number, payload: ActualizarWebBeneficioPayload, imagen?: File): Observable<WebBeneficio> {
    const formData = new FormData();
    if (payload.nombre !== undefined) formData.append('nombre', payload.nombre);
    if (payload.descripcion !== undefined) formData.append('descripcion', payload.descripcion);
    if (payload.orden !== undefined) formData.append('orden', payload.orden.toString());
    if (payload.instagramUrl !== undefined) formData.append('instagramUrl', payload.instagramUrl);
    if (imagen) formData.append('imagen', imagen);

    return this.http.patch<WebBeneficio>(`${this.apiUrl}/${id}`, formData);
  }

  eliminarBeneficio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  eliminarImagen(id: number): Observable<WebBeneficio> {
    return this.http.delete<WebBeneficio>(`${this.apiUrl}/${id}/imagen`);
  }
}