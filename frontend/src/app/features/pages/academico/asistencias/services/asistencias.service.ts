import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  Asistencia,
  RegistrarAsistenciasLotePayload,
  ReporteAsistenciaMensual,
  DetalleAsistenciaDiaria
} from '../models/asistencia.interface';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private supabase = inject(SupabaseService).client;

  /**
   * Lista las asistencias de una clase específica (Admin, Profe, Kine)
   */
  async listarPorClase(claseId: number): Promise<Asistencia[]> {
    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .select('*')
      .eq('clase_id', claseId);

    if (error) {
      throw new Error(`No se pudo listar la asistencia: ${error.message}`);
    }

    return (data ?? []) as Asistencia[];
  }

  /**
   * Guarda o actualiza en lote la asistencia de una clase (Admin, Profe)
   */
  async registrarLote(
    claseId: number,
    payload: RegistrarAsistenciasLotePayload
  ): Promise<Asistencia[]> {
    const filas = payload.asistencias.map((a) => ({
      clase_id: claseId,
      estudiante_id: a.estudianteId,
      presente: a.presente,
    }));

    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .upsert(filas, { onConflict: 'clase_id,estudiante_id' })
      .select();

    if (error) {
      throw new Error(`No se pudo registrar la asistencia: ${error.message}`);
    }

    return (data ?? []) as Asistencia[];
  }

  /**
   * Lista todas las asistencias del estudiante logueado (Solo Estudiante)
   * RLS filtra automáticamente por estudiante_id = auth.uid()
   */
  async obtenerMisAsistencias(): Promise<Asistencia[]> {
    const { data: authData } = await this.supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .select('*')
      .eq('estudiante_id', userId)
      .order('clase_id', { ascending: false });

    if (error) {
      throw new Error(`No se pudo obtener tus asistencias: ${error.message}`);
    }

    return (data ?? []) as Asistencia[];
  }

  /**
   * Lista las asistencias de un estudiante específico (Admin, Profe, Kine)
   */
  async listarPorEstudiante(estudianteId: string): Promise<Asistencia[]> {
    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('clase_id', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar la asistencia del estudiante: ${error.message}`);
    }

    return (data ?? []) as Asistencia[];
  }

  /**
   * Genera el reporte mensual consolidado de asistencia por grupo.
   * Calcula el porcentaje de asistencia de cada alumno activo del grupo.
   */
  async obtenerReporteMensual(
    grupoId: number,
    mes: number,
    anio: number
  ): Promise<ReporteAsistenciaMensual[]> {
    // 1. Obtener los alumnos activos del grupo uniendo usu_estudiantes con usu_perfiles
    const { data: alumnos, error: errorAlumnos } = await this.supabase
      .from('usu_estudiantes')
      .select(`
        id_usuario,
        usu_perfiles!inner(nombre, apellido, rut, foto_url, activo)
      `)
      .eq('grupo_id', grupoId)
      .eq('usu_perfiles.activo', true);

    if (errorAlumnos) {
      throw new Error(`Error al obtener estudiantes: ${errorAlumnos.message}`);
    }

    // 2. Calcular rango de fechas del mes solicitado
    const mesStr = ('0' + mes).slice(-2);
    const primerDia = `${anio}-${mesStr}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${mesStr}-${ultimoDiaNum}`;

    // 3. Obtener las clases de ese grupo en el mes específico
    const { data: clasesMes, error: errorClases } = await this.supabase
      .from('aca_clases')
      .select('id')
      .eq('grupo_id', grupoId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);

    if (errorClases) {
      throw new Error(`Error al obtener clases: ${errorClases.message}`);
    }

    const claseIds = clasesMes?.map((c) => c.id) || [];
    const totalClasesEnElMes = claseIds.length;

    if (totalClasesEnElMes === 0) {
      return (alumnos || []).map((est: any) => {
        const perfil = Array.isArray(est.usu_perfiles) ? est.usu_perfiles[0] : est.usu_perfiles;
        return {
          estudiante_id: est.id_usuario,
          nombre: perfil?.nombre || '',
          apellido: perfil?.apellido || '',
          rut: perfil?.rut || null,
          foto_url: perfil?.foto_url || null,
          total_clases: 0,
          total_presentes: 0,
          porcentaje: 0,
          resumen: '0 / 0'
        };
      });
    }

    // 4. Obtener todas las asistencias marcadas para esas clases
    const { data: asistencias, error: errorAsistencias } = await this.supabase
      .from('aca_asistencias')
      .select('estudiante_id, presente')
      .in('clase_id', claseIds);

    if (errorAsistencias) {
      throw new Error(`Error al obtener asistencias: ${errorAsistencias.message}`);
    }

    // 5. Cruzar datos y calcular porcentajes
    return (alumnos || []).map((est: any) => {
      const perfil = Array.isArray(est.usu_perfiles) ? est.usu_perfiles[0] : est.usu_perfiles;
      const registrosAlumno = asistencias?.filter((a) => a.estudiante_id === est.id_usuario) || [];
      const totalPresentes = registrosAlumno.filter((a) => a.presente === true).length;
      const porcentaje = Math.round((totalPresentes / totalClasesEnElMes) * 100);

      return {
        estudiante_id: est.id_usuario,
        nombre: perfil?.nombre || '',
        apellido: perfil?.apellido || '',
        rut: perfil?.rut || null,
        foto_url: perfil?.foto_url || null,
        total_clases: totalClasesEnElMes,
        total_presentes: totalPresentes,
        porcentaje,
        resumen: `${totalPresentes} / ${totalClasesEnElMes}`
      };
    });
  }

  /**
   * Obtiene el detalle día a día de las asistencias de un alumno en un mes específico.
   */
  async obtenerDetalleMensualEstudiante(
    estudianteId: string,
    mes: number,
    anio: number
  ): Promise<DetalleAsistenciaDiaria[]> {
    const mesStr = ('0' + mes).slice(-2);
    const primerDia = `${anio}-${mesStr}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${mesStr}-${ultimoDiaNum}`;

    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .select(`
        presente,
        aca_clases!inner(fecha, hora, lugar, grupo_id)
      `)
      .eq('estudiante_id', estudianteId)
      .gte('aca_clases.fecha', primerDia)
      .lte('aca_clases.fecha', ultimoDia)
      .order('aca_clases(fecha)', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener detalle del estudiante: ${error.message}`);
    }

    return (data || []).map((reg: any) => {
      const clase = Array.isArray(reg.aca_clases) ? reg.aca_clases[0] : reg.aca_clases;
      return {
        presente: reg.presente,
        fecha: clase?.fecha,
        hora: clase?.hora,
        lugar: clase?.lugar || null
      };
    });
  }
}