import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebPrograma, CrearWebProgramaPayload, ActualizarWebProgramaPayload } from '../models/web-programa.interface';

@Injectable({
  providedIn: 'root'
})
export class WebProgramaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-programas`;

  listarProgramas(): Observable<WebPrograma[]> {
    return this.http.get<WebPrograma[]>(this.apiUrl);
  }

  obtenerProgramaPorId(id: number): Observable<WebPrograma> {
    return this.http.get<WebPrograma>(`${this.apiUrl}/${id}`);
  }

  crearPrograma(payload: CrearWebProgramaPayload): Observable<WebPrograma> {
    return this.http.post<WebPrograma>(this.apiUrl, payload);
  }

  actualizarPrograma(id: number, payload: ActualizarWebProgramaPayload): Observable<WebPrograma> {
    return this.http.patch<WebPrograma>(`${this.apiUrl}/${id}`, payload);
  }

  eliminarPrograma(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}