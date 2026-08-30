import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebMetodologia, CrearWebMetodologiaPayload, ActualizarWebMetodologiaPayload } from '../models/web-metodologia.interface';

@Injectable({
  providedIn: 'root'
})
export class WebMetodologiaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-metodologias`;

  listarMetodologias(): Observable<WebMetodologia[]> {
    return this.http.get<WebMetodologia[]>(this.apiUrl);
  }

  obtenerMetodologiaPorId(id: number): Observable<WebMetodologia> {
    return this.http.get<WebMetodologia>(`${this.apiUrl}/${id}`);
  }

  crearMetodologia(payload: CrearWebMetodologiaPayload): Observable<WebMetodologia> {
    return this.http.post<WebMetodologia>(this.apiUrl, payload);
  }

  actualizarMetodologia(id: number, payload: ActualizarWebMetodologiaPayload): Observable<WebMetodologia> {
    return this.http.patch<WebMetodologia>(`${this.apiUrl}/${id}`, payload);
  }

  eliminarMetodologia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}