import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { WebConfiguracion, ActualizarWebConfiguracionPayload } from '../models/web-configuracion.interface';

@Injectable({
  providedIn: 'root'
})
export class WebConfiguracionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/web-configuracion`;

  /**
   * GET /web-configuracion
   * Obtiene la configuración general de la landing page (Público).
   */
  obtenerConfiguracion(): Observable<WebConfiguracion> {
    return this.http.get<WebConfiguracion>(this.apiUrl);
  }

  /**
   * PATCH /web-configuracion
   * Actualiza los textos, enlaces y redes sociales de la landing page (Solo Administrador).
   */
  actualizarConfiguracion(payload: ActualizarWebConfiguracionPayload): Observable<WebConfiguracion> {
    return this.http.patch<WebConfiguracion>(this.apiUrl, payload);
  }
}