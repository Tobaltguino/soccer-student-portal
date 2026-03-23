import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // 1. DASHBOARD & ACTIVIDAD
  // ==========================================

  async getActividadReciente() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select('*, grupos(nombre), tipo_evaluacion(nombre)')
      .order('created_at', { ascending: false })
      .limit(5);
  }

  // ==========================================
  // 2. KINESIOLOGÍA (Asignación de Grupos)
  // ==========================================

  async getGruposDeKine(kineId: string) {
    return await this.supabase
      .from('grupos_kine')
      .select(`
        grupo_id,
        grupos (*)
      `)
      .eq('kinesiologo_id', kineId);
  }

  async getKinesiologosDeEstudiante(estudianteId: string) {
    // 1. Descubrir grupo del alumno
    const { data: alumno, error: errorAlumno } = await this.supabase
      .from('estudiantes') 
      .select('grupo_id')
      .eq('id', estudianteId)
      .single();

    if (errorAlumno || !alumno || !alumno.grupo_id) {
      return { data: null, error: errorAlumno || new Error('Alumno sin grupo') };
    }

    // 2. Buscar Kinesiólogo del grupo
    const { data: dataKine, error: errorKine } = await this.supabase
      .from('grupos_kine')
      .select('kinesiologos (*)')
      .eq('grupo_id', alumno.grupo_id);

    if (errorKine) return { data: null, error: errorKine };

    // 3. Limpiar respuesta
    const kines = dataKine.map(item => item.kinesiologos).filter(k => k !== null);
    return { data: kines, error: null };
  }

  async asignarGrupoAKine(kineId: string, grupoId: string) {
    return await this.supabase.from('grupos_kine').insert({ kinesiologo_id: kineId, grupo_id: grupoId });
  }

  async removerGrupoDeKine(kineId: string, grupoId: string) {
    return await this.supabase
      .from('grupos_kine')
      .delete()
      .match({ kinesiologo_id: kineId, grupo_id: grupoId });
  }

  // ==========================================
  // 3. EVALUACIONES FÍSICAS (Rendimiento)
  // ==========================================

  async getTiposEvaluacion() {
    return await this.supabase.from('tipo_evaluacion').select('*').order('nombre');
  }

  async createTipoEvaluacion(dato: any) { return await this.supabase.from('tipo_evaluacion').insert(dato).select(); }
  async updateTipoEvaluacion(id: number, payload: any) { return await this.supabase.from('tipo_evaluacion').update(payload).eq('id', id).select(); }
  async eliminarTipoEvaluacion(id: number) { return await this.supabase.from('tipo_evaluacion').delete().eq('id', id); }

  async getRangosPorTipo(tipoId: number) {
    return await this.supabase
      .from('evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoId)
      .order('edad_min', { ascending: true })  
      .order('valor_min', { ascending: true });
  }

  async createRango(rango: any) { return await this.supabase.from('evaluacion_rangos').insert(rango); }
  async eliminarRango(id: number) { return await this.supabase.from('evaluacion_rangos').delete().eq('id', id); }
  
  async eliminarRangosPorTipo(tipoId: number) {
    return await this.supabase.from('evaluacion_rangos').delete().eq('tipo_evaluacion_id', tipoId);
  }

  async getSesionesEvaluacion() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select(`
        *,
        grupos!evaluaciones_sesiones_grupo_id_fkey ( nombre ),
        tipo_evaluacion!evaluaciones_sesiones_tipo_evaluacion_id_fkey ( nombre, unidad_medida )
      `)
      .order('fecha', { ascending: false });
  }

  async getSesionesEvaluacionPorGrupos(grupoIds: string[]) {
    return await this.supabase
      .from('evaluaciones_sesiones') 
      .select(`
        id, fecha, estado, grupo_id, tipo_evaluacion_id,
        grupos (nombre),
        tipo_evaluacion (nombre, unidad_medida)
      `)
      .in('grupo_id', grupoIds);
  }

  async crearSesionEvaluacion(datos: any) { return await this.supabase.from('evaluaciones_sesiones').insert(datos).select().single(); }
  async updateSesionEvaluacion(id: string, datos: any) { return await this.supabase.from('evaluaciones_sesiones').update(datos).eq('id', id).select(); }
  async eliminarSesionEvaluacion(id: string) { return await this.supabase.from('evaluaciones_sesiones').delete().eq('id', id); }

  async getResultadosPorSesion(sesionId: string) {
    return await this.supabase.from('evaluaciones_resultados').select('*').eq('sesion_id', sesionId);
  }

  async guardarResultadosMasivos(resultados: any[]) {
    return await this.supabase
      .from('evaluaciones_resultados')
      .upsert(resultados, { onConflict: 'sesion_id, estudiante_id' });
  }

  // Lógica pesada: Cálculo de resultados y rangos del alumno
  async getEvaluacionesAlumno(uid: string, fechaDesde?: string) {
    try {
      const { data: estudiante } = await this.supabase.from('estudiantes').select('fecha_nacimiento').eq('id', uid).single();
      const fechaNac = estudiante?.fecha_nacimiento;

      let query = this.supabase
        .from('evaluaciones_resultados')
        .select(`
          *,
          evaluaciones_sesiones!inner (
            fecha,
            tipo_evaluacion!inner (
              id, nombre, unidad_medida, descripcion,
              evaluacion_rangos (*) 
            )
          )
        `)
        .eq('estudiante_id', uid);

      if (fechaDesde) query = query.gte('evaluaciones_sesiones.fecha', fechaDesde);

      const { data, error } = await query;
      if (error) throw error;

      const dataFormateada = data?.map(res => {
        const valor = res.valor_numerico;
        const fechaPrueba = res.evaluaciones_sesiones?.fecha;
        const rangos = res.evaluaciones_sesiones?.tipo_evaluacion?.evaluacion_rangos || [];
        
        let edadAlMomento = 0;
        if (fechaNac && fechaPrueba) {
           const nac = new Date(fechaNac + 'T00:00:00');
           const evalDate = new Date(fechaPrueba + 'T00:00:00');
           edadAlMomento = evalDate.getFullYear() - nac.getFullYear();
           const m = evalDate.getMonth() - nac.getMonth();
           if (m < 0 || (m === 0 && evalDate.getDate() < nac.getDate())) edadAlMomento--;
        }

        const rangoEncontrado = rangos.find((r: any) => 
          edadAlMomento >= r.edad_min && edadAlMomento <= r.edad_max && 
          valor >= r.valor_min && valor <= r.valor_max
        );

        let nivelFinal = 'Sin Rango';
        let colorFinal = '#64748b';

        if (edadAlMomento === 0) {
            nivelFinal = 'Falta Edad'; 
        } else if (rangoEncontrado) {
            nivelFinal = rangoEncontrado.nombre_etiqueta;
            colorFinal = rangoEncontrado.color_sugerido;
        }

        return {
          id: res.id,
          resultado: valor,
          observacion: res.observacion,
          fecha: fechaPrueba,
          created_at: res.created_at,
          test_nombre: res.evaluaciones_sesiones?.tipo_evaluacion?.nombre,
          test_descripcion: res.evaluaciones_sesiones?.tipo_evaluacion?.descripcion,
          unidad: res.evaluaciones_sesiones?.tipo_evaluacion?.unidad_medida,
          edad_evaluacion: edadAlMomento, 
          nivel: nivelFinal, 
          color: colorFinal  
        };
      });

      return { data: dataFormateada, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ==========================================
  // 4. MÓDULO NUTRICIÓN
  // ==========================================

  async getTiposEvaluacionNutri() { return await this.supabase.from('tipo_evaluacion_nutri').select('*'); }
  async crearTipoEvaluacionNutri(tipo: { nombre: string, descripcion: string }) { return await this.supabase.from('tipo_evaluacion_nutri').insert(tipo).select().single(); }
  async eliminarTipoEvaluacionNutri(id: string) { return await this.supabase.from('tipo_evaluacion_nutri').delete().eq('id', id); }

  async getEvaluacionesNutri() {
    return await this.supabase
      .from('evaluacion_nutri')
      .select('*, tipo_evaluacion:tipo_evaluacion_nutri(nombre)')
      .order('fecha', { ascending: false });
  }

  async crearEvaluacionNutri(evaluacion: { tipo_id: string, nutricionista_id: string, fecha: string, estado: string }) {
    return await this.supabase.from('evaluacion_nutri').insert(evaluacion).select().single();
  }

  async actualizarEvaluacionNutri(id: string, evaluacion: any) {
    return await this.supabase.from('evaluacion_nutri').update(evaluacion).eq('id', id).select().single();
  }

  async eliminarEvaluacionNutri(id: string) { return await this.supabase.from('evaluacion_nutri').delete().eq('id', id); }

  async getResultadosPorSesionNutri(sesionId: string) { return await this.supabase.from('evaluacion_resultado_nutri').select('*').eq('evaluacion_id', sesionId); }

  async getResultadosNutriEstudiante(estudianteId: string) {
    return await this.supabase
      .from('evaluacion_resultado_nutri')
      .select(`
        archivo_url, observaciones,
        evaluacion:evaluacion_nutri (
          id, fecha, estado,
          tipo_evaluacion:tipo_evaluacion_nutri (nombre)
        )
      `)
      .eq('estudiante_id', estudianteId);
  }

  async guardarResultadoNutri(resultado: { evaluacion_id: string, estudiante_id: string, archivo_url: string, observaciones: string }) {
    return await this.supabase.from('evaluacion_resultado_nutri').upsert(resultado, { onConflict: 'evaluacion_id,estudiante_id' }); 
  }

  // ==========================================
  // 5. HISTORIAL CLÍNICO
  // ==========================================

  async getHistorialClinico(estudianteId: string) {
    return await this.supabase
      .from('historial_clinico')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('fecha_evento', { ascending: false });
  }

  async getAllRangos() {
  return await this.supabase.from('evaluacion_rangos').select('*');
}

// Procesa la lista de estudiantes cruzando con resultados previos
async prepararPlanillaCalificaciones(grupoId: number, sesionId: string, alumnos: any[]) {
  const { data: resultados } = await this.getResultadosPorSesion(sesionId);
  
  return alumnos.map((alumno: any) => {
    const notaExistente = resultados?.find((r: any) => r.estudiante_id === alumno.id);
    return {
      estudiante_id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
      observacion: notaExistente ? notaExistente.observacion : ''
    };
  });
  }

  // ==========================================
  // NUTRICIONISTAS
  // ==========================================
  
  // Obtiene la lista básica de nutricionistas para asignarlos a sesiones
  async getNutricionistas() {
    return await this.supabase
      .from('nutricionistas')
      .select('id, nombre, apellido')
      .order('nombre', { ascending: true });
  }

  async getKinesiologos() {
    return await this.supabase
      .from('kinesiologos')
      .select('*, grupos_kine(grupo_id)')
      .order('apellido', { ascending: true });
  }

  // Usamos "Completos" para no chocar con el getNutricionistas() que creamos antes 
  // que solo traía id y nombre para los dropdowns.
  async getNutricionistasCompletos() {
    return await this.supabase
      .from('nutricionistas')
      .select('*')
      .order('apellido', { ascending: true });
  }
}