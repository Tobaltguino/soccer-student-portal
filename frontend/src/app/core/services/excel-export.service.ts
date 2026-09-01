import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  private apiUrl = environment.apiUrl; // ej: 'http://localhost:3000'

  constructor(private http: HttpClient) {}

  /**
   * Método mágico que toma el binario (Blob) y fuerza la descarga en el navegador
   */
  private descargarArchivo(blob: Blob, nombreArchivo: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ==========================================
  // 1. EXPORTAR USUARIOS
  // ==========================================
  exportarUsuarios(filtros: any = {}) {
    let params = new HttpParams();
    // Agregamos los filtros a la URL si existen
    if (filtros.rol) params = params.set('rol', filtros.rol);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.activo !== undefined) params = params.set('activo', filtros.activo);

    this.http.get(`${this.apiUrl}/usuarios/exportar/excel`, { 
      params, 
      responseType: 'blob' // ¡ESTO ES VITAL!
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, 'usuarios_profutbol.xlsx'),
      error: (err) => console.error('Error descargando usuarios', err)
    });
  }

  // ==========================================
  // 2. EXPORTAR ASISTENCIAS (REPORTE MENSUAL)
  // ==========================================
  exportarAsistenciasMensuales(grupoId: number, mes: number, anio: number) {
    let params = new HttpParams()
      .set('grupoId', grupoId.toString())
      .set('mes', mes.toString())
      .set('anio', anio.toString());

    this.http.get(`${this.apiUrl}/reportes/mensual/exportar/excel`, { 
      params, 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, `asistencias_${mes}_${anio}.xlsx`),
      error: (err) => console.error('Error descargando asistencias', err)
    });
  }

  // ==========================================
  // 3. EXPORTAR GRUPOS
  // ==========================================
  exportarGrupos(incluirEliminados: boolean = false) {
    let params = new HttpParams().set('incluirEliminados', incluirEliminados.toString());

    this.http.get(`${this.apiUrl}/grupos/exportar/excel`, { 
      params, 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, 'grupos_profutbol.xlsx'),
      error: (err) => console.error('Error descargando grupos', err)
    });
  }

  // ==========================================
  // 4. EXPORTAR CLASES
  // ==========================================
  exportarClases(filtros: any = {}) {
    let params = new HttpParams();
    if (filtros.grupoId) params = params.set('grupoId', filtros.grupoId);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);

    this.http.get(`${this.apiUrl}/clases/exportar/excel`, { 
      params, 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, 'clases_profutbol.xlsx'),
      error: (err) => console.error('Error descargando clases', err)
    });
  }

  // ==========================================
  // 5. EXPORTAR RESULTADOS ACADÉMICOS
  // ==========================================
  exportarResultadosAcademicos(sesionId: string) {
    this.http.get(`${this.apiUrl}/evaluaciones-sesiones/${sesionId}/resultados/exportar/excel`, { 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, `resultados_sesion_${sesionId.substring(0,6)}.xlsx`),
      error: (err) => console.error('Error descargando resultados académicos', err)
    });
  }

  // ==========================================
  // 6. EXPORTAR RESULTADOS KINESIOLOGÍA
  // ==========================================
  exportarResultadosKine(sesionId: string) {
    this.http.get(`${this.apiUrl}/kine-evaluaciones-sesiones/${sesionId}/resultados/exportar/excel`, { 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => this.descargarArchivo(blob, `kine_resultados_${sesionId.substring(0,6)}.xlsx`),
      error: (err) => console.error('Error descargando resultados kine', err)
    });
  }
}