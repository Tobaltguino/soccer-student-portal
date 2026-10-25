import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';

// Servicios Feature-Based (Ajusta las rutas a tu estructura final)
import { UsuarioCentralService } from '../../features/pages/administracion/usuarios/services/usuarios-central.service';
import { GrupoService } from '../../features/pages/academico/grupos/services/grupo.service';
import { ClaseService } from '../../features/pages/academico/clases/services/clases.service';
import { KineResultadoService } from '../../features/pages/salud/kinesiologia/evaluaciones/services/kine-resultado.service';
// import { AsistenciaService } from '../../features/pages/academico/asistencias/services/asistencia.service';
// import { EvaluacionAcademicaService } from '../../features/pages/academico/evaluaciones/services/evaluacion.service';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  private usuarioService = inject(UsuarioCentralService);
  private grupoService = inject(GrupoService);
  private claseService = inject(ClaseService);
  private kineResultadoService = inject(KineResultadoService);
  // private asistenciaService = inject(AsistenciaService);
  // private academicoResultadoService = inject(EvaluacionAcademicaService);

  /**
   * Genera el archivo Excel en el navegador a partir de un arreglo JSON
   */
  private generarExcel(data: any[], nombreArchivo: string) {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar a Excel');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    
    // Fuerza la descarga en el navegador
    XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
  }

  // ==========================================
  // 1. EXPORTAR USUARIOS
  // ==========================================
  async exportarUsuarios(filtros: any = {}) {
    try {
      const res = await this.usuarioService.listarUsuarios(filtros);
      const data = (res?.registros || []).map((u: any) => ({
        ID: u.id_usuario || u.id,
        RUT: u.rut || 'Sin RUT',
        Nombres: u.nombre,
        Apellidos: u.apellido,
        Rol: (u.rol || '').toUpperCase(),
        Estado: u.activo ? 'Activo' : 'Inactivo',
        'Fecha Registro': new Date(u.created_at).toLocaleDateString()
      }));
      this.generarExcel(data, 'usuarios_profutbol');
    } catch (error) {
      console.error('Error exportando usuarios', error);
    }
  }

  // ==========================================
  // 2. EXPORTAR ASISTENCIAS (REPORTE MENSUAL)
  // ==========================================
  async exportarAsistenciasMensuales(grupoId: number, mes: number, anio: number) {
    try {
      // Reemplaza con la llamada a tu AsistenciaService
      // const res = await this.asistenciaService.obtenerReporteMensual(grupoId, mes, anio);
      // const data = res.map(...);
      // this.generarExcel(data, `asistencias_${mes}_${anio}`);
      console.warn('Método de asistencias pendiente de conexión al servicio');
    } catch (error) {
      console.error('Error exportando asistencias', error);
    }
  }

  // ==========================================
  // 3. EXPORTAR GRUPOS
  // ==========================================
  async exportarGrupos(incluirEliminados: boolean = false) {
    try {
      const res = await this.grupoService.listarGrupos(); 
      const data = (res || []).map((g: any) => ({
        ID: g.id,
        Nombre: g.nombre,
        Categoría: g.categoria || 'Sin Categoría',
        Profesor: g.profesor?.nombre ? `${g.profesor.nombre} ${g.profesor.apellido}` : 'Sin asignar',
        'Total Alumnos': g.estudiantes?.[0]?.count || 0
      }));
      this.generarExcel(data, 'grupos_profutbol');
    } catch (error) {
      console.error('Error exportando grupos', error);
    }
  }

  // ==========================================
  // 4. EXPORTAR CLASES
  // ==========================================
  async exportarClases(filtros: any = {}) {
    try {
      const res = await this.claseService.listarClases(filtros);
      const data = (res?.registros || []).map((c: any) => ({
        ID: c.id,
        Fecha: c.fecha,
        Hora: c.hora,
        Grupo: c.grupo?.nombre || 'Sin Grupo',
        Profesor: c.profesor?.nombre ? `${c.profesor.nombre} ${c.profesor.apellido}` : 'Sin asignar',
        Estado: c.estado
      }));
      this.generarExcel(data, 'clases_profutbol');
    } catch (error) {
      console.error('Error exportando clases', error);
    }
  }

  // ==========================================
  // 5. EXPORTAR RESULTADOS ACADÉMICOS
  // ==========================================
  async exportarResultadosAcademicos(sesionId: string) {
    try {
      // Reemplaza con la llamada a tu EvaluacionAcademicaService
      // const res = await this.academicoResultadoService.listarResultadosPorSesion(sesionId);
      // const data = res.map(...);
      // this.generarExcel(data, `resultados_sesion_${sesionId.substring(0,6)}`);
      console.warn('Método académico pendiente de conexión al servicio');
    } catch (error) {
      console.error('Error exportando resultados académicos', error);
    }
  }

  // ==========================================
  // 6. EXPORTAR RESULTADOS KINESIOLOGÍA
  // ==========================================
  async exportarResultadosKine(sesionId: string) {
    try {
      const res = await this.kineResultadoService.listarResultadosPorSesion(sesionId);
      const data = (res || []).map((r: any) => ({
        Estudiante: `${r.alumno?.nombre || ''} ${r.alumno?.apellido || ''}`.trim(),
        Parámetro: r.subevaluacion?.nombre || 'General',
        'Resultado Único': r.resultado_unico !== null ? r.resultado_unico : '-',
        'Resultado Izquierdo': r.resultado_izquierdo !== null ? r.resultado_izquierdo : '-',
        'Resultado Derecho': r.resultado_derecho !== null ? r.resultado_derecho : '-',
        Rango: r.rango || 'Sin especificar',
        Observaciones: r.observacion || ''
      }));
      this.generarExcel(data, `kine_resultados_${sesionId.substring(0,6)}`);
    } catch (error) {
      console.error('Error exportando resultados kine', error);
    }
  }
}