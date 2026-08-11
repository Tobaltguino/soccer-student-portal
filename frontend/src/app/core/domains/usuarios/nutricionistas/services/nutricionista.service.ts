import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Nutricionista } from '../models/nutricionista.interface';

@Injectable({
  providedIn: 'root'
})
export class NutricionistaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nutricionistas`;

  /**
   * GET /nutricionistas
   * Lista todos los registros de la tabla nutricionistas (Solo Administrador).
   */
  listarNutricionistas(): Observable<Nutricionista[]> {
    return this.http.get<Nutricionista[]>(this.apiUrl);
  }

  /**
   * GET /nutricionistas/:id
   * Obtiene el registro de nutricionista por su usuario_id (Solo Administrador).
   */
  obtenerNutricionistaPorId(usuarioId: string): Observable<Nutricionista> {
    return this.http.get<Nutricionista>(`${this.apiUrl}/${usuarioId}`);
  }
}