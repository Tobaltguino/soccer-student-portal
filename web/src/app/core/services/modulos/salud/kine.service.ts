import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({
  providedIn: 'root'
})
export class KinesiologiaService {
  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // STAFF MÉDICO
  // ==========================================
  async getKinesiologos() { return await this.supabase.from('kinesiologos').select('*, grupos_kine(grupo_id)').order('apellido', { ascending: true }); }
  async getKineByEmail(email: string) { return await this.supabase.from('kinesiologos').select('id').eq('email', email).maybeSingle(); }
  async getGruposDeKine(kineId: string) { return await this.supabase.from('grupos_kine').select('grupo_id, grupos (*)').eq('kinesiologo_id', kineId); }
  
  async getKinesiologosDeEstudiante(estudianteId: string) {
    const { data: alumno, error: errorAlumno } = await this.supabase.from('estudiantes').select('grupo_id').eq('id', estudianteId).single();
    if (errorAlumno || !alumno?.grupo_id) return { data: null, error: errorAlumno || new Error('Alumno sin grupo') };
    const { data: dataKine, error: errorKine } = await this.supabase.from('grupos_kine').select('kinesiologos (*)').eq('grupo_id', alumno.grupo_id);
    if (errorKine) return { data: null, error: errorKine };
    const kines = dataKine.map(item => item.kinesiologos).filter(k => k !== null);
    return { data: kines, error: null };
  }

  async asignarGrupoAKine(kineId: string, grupoId: string) { return await this.supabase.from('grupos_kine').insert({ kinesiologo_id: kineId, grupo_id: grupoId }); }
  async removerGrupoDeKine(kineId: string, grupoId: string) { return await this.supabase.from('grupos_kine').delete().match({ kinesiologo_id: kineId, grupo_id: grupoId }); }

  // ==========================================
  // HISTORIAL CLÍNICO (Lesiones y Antecedentes)
  // ==========================================
  async getHistorialClinico(estudianteId: string) { return await this.supabase.from('historial_clinico').select('*').eq('estudiante_id', estudianteId).order('fecha_evento', { ascending: false }); }
  async crearHistorialClinico(data: any) { return await this.supabase.from('historial_clinico').insert(data).select().single(); }
  async updateHistorialClinico(id: string, data: any) { return await this.supabase.from('historial_clinico').update(data).eq('id', id).select().single(); }
  async eliminarHistorialClinico(id: string) { return await this.supabase.from('historial_clinico').delete().eq('id', id); }
  async getEstadosClinicosAlumnos(alumnoIds: string[]) {
    return await this.supabase
      .from('historial_clinico')
      .select('estudiante_id, estado')
      .in('estudiante_id', alumnoIds)
      .in('estado', ['EN_TRATAMIENTO', 'EN_OBSERVACION', 'EN_REINTEGRO_DEPORTIVO']);
  }

  // ==========================================
  // FICHA EVOLUTIVA KINESIOLÓGICA
  // ==========================================
  async crearFichaEvolutiva(ficha: any) { return await this.supabase.from('ficha_evolutiva').insert(ficha).select().single(); }
  async updateFichaEvolutiva(id: string, ficha: any) { return await this.supabase.from('ficha_evolutiva').update(ficha).eq('id', id).select().single(); }
  async getFichasPorEstudiante(estudianteId: string) { return await this.supabase.from('ficha_evolutiva').select('*, kinesiologos (nombre, apellido)').eq('estudiante_id', estudianteId).order('fecha_creacion', { ascending: false }); }
  async getFichaEvolutivaPorId(id: string) { return await this.supabase.from('ficha_evolutiva').select('*').eq('id', id).single(); }
  async eliminarFichaEvolutiva(id: string) { return await this.supabase.from('ficha_evolutiva').delete().eq('id', id); }

  // ==========================================
  // EVALUACIONES KINESIOLÓGICAS
  // ==========================================
  async getTiposEvaluacionKine() { return await this.supabase.from('tipos_evaluacion_kine').select('*').order('nombre'); }
  async crearTipoEvaluacionKine(tipo: any) { return await this.supabase.from('tipos_evaluacion_kine').insert(tipo).select().single(); }
  async eliminarTipoEvaluacionKine(id: string) { return await this.supabase.from('tipos_evaluacion_kine').delete().eq('id', id); }
  
  async getEvaluacionesKine() { return await this.supabase.from('evaluaciones_sesiones_kine').select('*, tipo_evaluacion:tipo_evaluacion_id(nombre)').order('fecha', { ascending: false }); }
  async crearEvaluacionKine(evaluacion: any) { return await this.supabase.from('evaluaciones_sesiones_kine').insert(evaluacion).select().single(); }
  async actualizarEvaluacionKine(id: string, evaluacion: any) { return await this.supabase.from('evaluaciones_sesiones_kine').update(evaluacion).eq('id', id).select().single(); }
  async eliminarEvaluacionKine(id: string) { return await this.supabase.from('evaluaciones_sesiones_kine').delete().eq('id', id); }

  async getResultadosKineEstudiante(estudianteId: string) { return await this.supabase.from('evaluaciones_resultados_kine').select('observaciones, evaluacion:evaluaciones_sesiones_kine ( id, fecha, estado, tipo_evaluacion:tipo_evaluacion_id (nombre) )').eq('estudiante_id', estudianteId); }
  async getSubEvaluacionesPorTipo(tipoId: number) { return await this.supabase.from('tipo_subevaluaciones_kine').select('*').eq('tipo_evaluacion_id', tipoId).order('id', { ascending: true }); }
  async getResultadosPorSesionKine(sesionId: string) { return await this.supabase.from('evaluaciones_resultados_kine').select('*').eq('sesion_id', sesionId); }
  async guardarResultadoKine(resultados: any[]) { return await this.supabase.from('evaluaciones_resultados_kine').upsert(resultados, { onConflict: 'sesion_id,estudiante_id,subevaluacion_id' }); }
  async getRangosEvaluacion() { return await this.supabase.from('evaluacion_rangos_kine').select('*'); }
}