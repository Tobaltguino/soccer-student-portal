import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Asistencia, RegistrarAsistenciasLotePayload } from '../models/asistencia.interface';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  // Como tu backend usa un controlador sin prefijo global, usamos la URL base
  private apiUrl = environment.apiUrl; 

  /**
   * GET /clases/:claseId/asistencias
   * Lista las asistencias de una clase específica (Para Admin, Profe, Kine)
   */
  listarPorClase(claseId: number): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/clases/${claseId}/asistencias`);
  }

  /**
   * POST /clases/:claseId/asistencias
   * Guarda o actualiza la asistencia completa de una clase (Para Admin, Profe)
   */
  registrarLote(claseId: number, payload: RegistrarAsistenciasLotePayload): Observable<Asistencia[]> {
    return this.http.post<Asistencia[]>(`${this.apiUrl}/clases/${claseId}/asistencias`, payload);
  }

  /**
   * GET /estudiantes/me/asistencias
   * Lista todas las asistencias del estudiante logueado (Solo Estudiante)
   */
  obtenerMisAsistencias(): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/estudiantes/me/asistencias`);
  }

  /**
   * GET /estudiantes/:estudianteId/asistencias
   * Lista las asistencias de un estudiante específico (Para Admin, Profe, Kine)
   */
  listarPorEstudiante(estudianteId: string): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/estudiantes/${estudianteId}/asistencias`);
  }

  /**
   * GET /asistencias/reportes/mensual
   * Obtiene el consolidado de asistencias de un grupo en un mes específico.
   */
  obtenerReporteMensual(grupoId: number, mes: number, anio: number): Observable<any[]> {
    let params = new HttpParams()
      .set('grupoId', grupoId.toString())
      .set('mes', mes.toString())
      .set('anio', anio.toString());

    return this.http.get<any[]>(`${this.apiUrl}/reportes/mensual`, { params });
  }

  /**
   * GET /asistencias/estudiantes/:id/asistencias/mensual
   * Obtiene el detalle día a día de un estudiante específico.
   */
  obtenerDetalleMensualEstudiante(estudianteId: string, mes: number, anio: number): Observable<any[]> {
    let params = new HttpParams()
      .set('mes', mes.toString())
      .set('anio', anio.toString());

    return this.http.get<any[]>(`${this.apiUrl}/estudiantes/${estudianteId}/asistencias/mensual`, { params });
  }
}