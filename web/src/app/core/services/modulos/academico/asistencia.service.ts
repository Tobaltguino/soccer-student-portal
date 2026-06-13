import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service';

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  constructor(private supabaseCore: SupabaseCoreService) {}
  private get supabase() { return this.supabaseCore.client; }

  async guardarAsistenciaMasiva(registros: any[]) {
    return await this.supabase.from('asistencias').upsert(registros, { onConflict: 'clase_id, estudiante_id' });
  }

  async getAsistenciaPorClase(claseId: number | string) {
    return await this.supabase.from('asistencias').select('estudiante_id, presente').eq('clase_id', claseId);
  }

  async getAsistenciasPorGrupoYFechas(grupoId: number | string, fechaInicio: string, fechaFin: string) {
    return await this.supabase.from('asistencias').select('estudiante_id, presente, clases!inner(fecha)').eq('clases.grupo_id', grupoId).gte('clases.fecha', fechaInicio).lte('clases.fecha', fechaFin);
  }

  async getHistorialAsistenciaAlumno(estudianteId: string, fechaInicio: string, fechaFin: string) {
    return await this.supabase.from('asistencias').select('presente, clases!inner(fecha, hora, lugar)').eq('estudiante_id', estudianteId).gte('clases.fecha', fechaInicio).lte('clases.fecha', fechaFin).order('clases(fecha)', { ascending: false });
  }

  async getEstudiantesConEstadisticas(grupoId: number, fechaInicio: string, fechaFin: string) {
    // Consulta directa para mantener el servicio de asistencia independiente
    const { data: alumnos, error: errAlumnos } = await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, grupo_id, rut, foto_url, fecha_nacimiento') 
      .eq('grupo_id', grupoId);

    if (errAlumnos) return { data: null, error: errAlumnos };

    const { data: asistencias, error: errAsis } = await this.getAsistenciasPorGrupoYFechas(grupoId, fechaInicio, fechaFin);
    if (errAsis) return { data: null, error: errAsis };

    const procesados = (alumnos || []).map((est: any) => {
      const registrosAlumno = asistencias?.filter((a: any) => a.estudiante_id === est.id) || [];
      const totalClases = registrosAlumno.length;
      const totalPresentes = registrosAlumno.filter((a: any) => a.presente).length;
      const porcentaje = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0;

      return { ...est, porcentaje, resumen: `${totalPresentes} / ${totalClases}` };
    });

    return { data: procesados, error: null };
  }

  // ==========================================
  // ESTADÍSTICAS Y VISTA DE ALUMNOS
  // ==========================================

  async getClasesAlumno(estudianteId: string, fechaInicio: string) {
    const { data, error } = await this.supabase
      .from('asistencia')
      .select(`
        presente,
        clases!inner (
          id,
          fecha,
          hora,
          lugar,
          grupo_id
        )
      `)
      .eq('estudiante_id', estudianteId)
      .gte('clases.fecha', fechaInicio)
      .order('clases(fecha)', { ascending: false });

    if (error) return { data: null, error };

    // Aplanamos el resultado para que el componente lo lea exactamente como lo espera: { fecha, hora, presente... }
    const clasesFormateadas = data.map((registro: any) => ({
      ...registro.clases,
      presente: registro.presente
    }));

    return { data: clasesFormateadas, error: null };
  }
}