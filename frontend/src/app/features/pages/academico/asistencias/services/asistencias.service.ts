import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  Asistencia,
  RegistrarAsistenciasLotePayload,
  ReporteAsistenciaMensual,
  DetalleAsistenciaDiaria
} from '../models/asistencia.interface';
import { hoyChile } from '../../../../../shared/utils/fechas.util';
import { StorageService, BUCKET_FOTOS_USUARIOS } from '../../../../../core/services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private supabase = inject(SupabaseService).client;
  private storage = inject(StorageService);

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
    const { data: authData } = await this.supabase.auth.getSession();
    const userId = authData?.session?.user?.id;

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
    // 1. Rango de fechas del mes. Solo cuentan las clases hasta hoy: las futuras
    //    aún no tienen asistencia y bajaban el porcentaje a mitad de mes.
    const { primerDia, ultimoDia } = this.rangoDelMes(mes, anio);
    const hoy = hoyChile();
    const hasta = ultimoDia < hoy ? ultimoDia : hoy;

    // 2 y 3. Alumnos activos del grupo y clases (no eliminadas) del mes, en paralelo
    const [
      { data: alumnos, error: errorAlumnos },
      { data: clasesMes, error: errorClases }
    ] = await Promise.all([
      this.supabase
        .from('usu_estudiantes')
        .select(`
          id_usuario,
          usu_perfiles!inner(nombre, apellido, rut, foto_url, activo)
        `)
        .eq('grupo_id', grupoId)
        .eq('usu_perfiles.activo', true),
      this.supabase
        .from('aca_clases')
        .select('id')
        .eq('grupo_id', grupoId)
        .is('eliminado_at', null)
        .gte('fecha', primerDia)
        .lte('fecha', hasta)
    ]);

    if (errorAlumnos) {
      throw new Error(`Error al obtener estudiantes: ${errorAlumnos.message}`);
    }

    if (errorClases) {
      throw new Error(`Error al obtener clases: ${errorClases.message}`);
    }

    const claseIds = clasesMes?.map((c) => c.id) || [];
    const totalClasesEnElMes = claseIds.length;

    // Fotos en bucket privado: URLs firmadas en una sola petición
    const firmarFoto = await this.storage.firmarUrls(
      BUCKET_FOTOS_USUARIOS,
      (alumnos || []).map((est: any) => (Array.isArray(est.usu_perfiles) ? est.usu_perfiles[0] : est.usu_perfiles)?.foto_url)
    );

    if (totalClasesEnElMes === 0) {
      return (alumnos || []).map((est: any) => {
        const perfil = Array.isArray(est.usu_perfiles) ? est.usu_perfiles[0] : est.usu_perfiles;
        return {
          estudiante_id: est.id_usuario,
          nombre: perfil?.nombre || '',
          apellido: perfil?.apellido || '',
          rut: perfil?.rut || null,
          foto_url: firmarFoto(perfil?.foto_url),
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

    // 5. Contar presentes por alumno una sola vez (antes se recorría la lista completa por cada alumno)
    const presentesPorAlumno = new Map<string, number>();
    for (const a of asistencias ?? []) {
      if (a.presente === true) {
        presentesPorAlumno.set(a.estudiante_id, (presentesPorAlumno.get(a.estudiante_id) ?? 0) + 1);
      }
    }

    // 6. Cruzar datos y calcular porcentajes
    return (alumnos || []).map((est: any) => {
      const perfil = Array.isArray(est.usu_perfiles) ? est.usu_perfiles[0] : est.usu_perfiles;
      const totalPresentes = presentesPorAlumno.get(est.id_usuario) ?? 0;
      const porcentaje = Math.round((totalPresentes / totalClasesEnElMes) * 100);

      return {
        estudiante_id: est.id_usuario,
        nombre: perfil?.nombre || '',
        apellido: perfil?.apellido || '',
        rut: perfil?.rut || null,
        foto_url: firmarFoto(perfil?.foto_url),
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
    const { primerDia, ultimoDia } = this.rangoDelMes(mes, anio);

    const { data, error } = await this.supabase
      .from('aca_asistencias')
      .select(`
        presente,
        aca_clases!inner(fecha, hora, lugar, grupo_id, eliminado_at)
      `)
      .eq('estudiante_id', estudianteId)
      .is('aca_clases.eliminado_at', null)
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

  /** Primer y último día del mes como 'YYYY-MM-DD' (con ceros, para comparar como texto). */
  private rangoDelMes(mes: number, anio: number): { primerDia: string; ultimoDia: string } {
    const mesStr = ('0' + mes).slice(-2);
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    return {
      primerDia: `${anio}-${mesStr}-01`,
      ultimoDia: `${anio}-${mesStr}-${('0' + ultimoDiaNum).slice(-2)}`
    };
  }
}