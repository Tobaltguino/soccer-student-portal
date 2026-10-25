import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';

// Servicios Feature-Based
import { UsuarioCentralService } from '../../features/pages/administracion/usuarios/services/usuarios-central.service';
import { GrupoService } from '../../features/pages/academico/grupos/services/grupo.service';
import { ClaseService } from '../../features/pages/academico/clases/services/clases.service';
import { AsistenciaService } from '../../features/pages/academico/asistencias/services/asistencias.service';
import { ResultadoEvaluacionService } from '../../features/pages/academico/evaluaciones/services/resultado-evaluacion.service';
import { KineResultadoService } from '../../features/pages/salud/kinesiologia/evaluaciones/services/kine-resultado.service';

// Máximo de filas por petición en Supabase
const LIMITE_EXPORTACION = 1000;

/**
 * Exportaciones a Excel generadas en el navegador.
 * Los métodos lanzan Error (sin datos o fallo de consulta) para que la pantalla
 * muestre el motivo; antes los errores se tragaban y no pasaba nada.
 */
@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  private usuarioService = inject(UsuarioCentralService);
  private grupoService = inject(GrupoService);
  private claseService = inject(ClaseService);
  private asistenciaService = inject(AsistenciaService);
  private resultadoAcademicoService = inject(ResultadoEvaluacionService);
  private kineResultadoService = inject(KineResultadoService);

  /**
   * Genera el archivo Excel en el navegador a partir de un arreglo JSON
   */
  private generarExcel(data: any[], nombreArchivo: string) {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar.');
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
    const res = await this.usuarioService.listarUsuarios({ limite: LIMITE_EXPORTACION, ...filtros });
    const data = (res?.registros || []).map((u: any) => ({
      RUT: u.rut || 'Sin RUT',
      Nombres: u.nombre,
      Apellidos: u.apellido,
      Email: u.email,
      Rol: (u.rol || '').toUpperCase(),
      Estado: u.activo ? 'Activo' : 'Inactivo',
      'Fecha Registro': u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL') : ''
    }));
    this.generarExcel(data, 'usuarios_profutbol');
  }

  // ==========================================
  // 2. EXPORTAR ASISTENCIAS (REPORTE MENSUAL)
  // ==========================================
  async exportarAsistenciasMensuales(grupoId: number, mes: number, anio: number) {
    const reporte = await this.asistenciaService.obtenerReporteMensual(grupoId, mes, anio);
    const data = (reporte || []).map(r => ({
      RUT: r.rut || 'Sin RUT',
      Nombres: r.nombre,
      Apellidos: r.apellido,
      'Clases del Mes': r.total_clases,
      Presentes: r.total_presentes,
      'Asistencia %': r.porcentaje
    }));
    const mesStr = ('0' + mes).slice(-2);
    this.generarExcel(data, `asistencias_grupo${grupoId}_${anio}-${mesStr}`);
  }

  // ==========================================
  // 3. EXPORTAR GRUPOS
  // ==========================================
  async exportarGrupos(incluirEliminados: boolean = false) {
    const res = await this.grupoService.listarGrupos(incluirEliminados);
    const data = (res || []).map((g: any) => ({
      ID: g.id,
      Nombre: g.nombre,
      Descripción: g.descripcion || '',
      'Total Alumnos': g.cantidad_alumnos ?? 0
    }));
    this.generarExcel(data, 'grupos_profutbol');
  }

  // ==========================================
  // 4. EXPORTAR CLASES
  // ==========================================
  async exportarClases(filtros: any = {}) {
    const [res, grupos] = await Promise.all([
      this.claseService.listarClases({ limite: LIMITE_EXPORTACION, ...filtros }),
      this.grupoService.listarGrupos(true)
    ]);
    const nombreGrupo = new Map((grupos || []).map((g: any) => [g.id, g.nombre]));

    const data = (res?.registros || []).map((c: any) => ({
      Fecha: c.fecha,
      Hora: c.hora,
      Grupo: nombreGrupo.get(c.grupo_id) || `Grupo #${c.grupo_id}`,
      Lugar: c.lugar || '',
      Objetivo: c.objetivo || ''
    }));
    this.generarExcel(data, 'clases_profutbol');
  }

  // ==========================================
  // 5. EXPORTAR RESULTADOS ACADÉMICOS
  // ==========================================
  async exportarResultadosAcademicos(sesionId: string) {
    const filas = await this.resultadoAcademicoService.obtenerDatosExcelPorSesion(sesionId);
    const data = (filas || []).map(f => ({
      RUT: f.rut,
      Estudiante: f.nombreCompleto,
      Edad: f.edad,
      Evaluación: f.nombreEvaluacion,
      Resultado: f.resultado,
      Rango: f.rango,
      Observación: f.observacion
    }));
    this.generarExcel(data, `resultados_sesion_${sesionId.substring(0, 6)}`);
  }

  // ==========================================
  // 6. EXPORTAR RESULTADOS KINESIOLOGÍA
  // ==========================================
  async exportarResultadosKine(sesionId: string) {
    const res = await this.kineResultadoService.listarResultadosPorSesion(sesionId);
    const data = (res || []).map((r: any) => ({
      Estudiante: `${r.alumno?.nombre || ''} ${r.alumno?.apellido || ''}`.trim(),
      RUT: r.alumno?.rut || '',
      Parámetro: r.subevaluacion?.nombre || 'General',
      'Resultado Único': r.resultado_unico ?? '-',
      'Resultado Izquierdo': r.resultado_izquierdo ?? '-',
      'Resultado Derecho': r.resultado_derecho ?? '-',
      Rango: r.rango?.etiqueta || 'Sin especificar',
      Observaciones: r.observacion || ''
    }));
    this.generarExcel(data, `kine_resultados_${sesionId.substring(0, 6)}`);
  }
}
