import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebConfiguracion, ActualizarWebConfiguracionPayload, LandingData } from '../models/web-configuracion.interface';

@Injectable({
  providedIn: 'root'
})
export class WebConfiguracionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-configuracion`;

  obtenerConfiguracion(): Observable<WebConfiguracion> {
    return this.http.get<WebConfiguracion>(this.apiUrl);
  }

  obtenerDatosLanding(): Observable<LandingData> {
    return this.http.get<LandingData>(`${this.apiUrl}/landing`);
  }

  actualizarConfiguracion(payload: ActualizarWebConfiguracionPayload): Observable<WebConfiguracion> {
    return this.http.patch<WebConfiguracion>(this.apiUrl, payload);
  }
}