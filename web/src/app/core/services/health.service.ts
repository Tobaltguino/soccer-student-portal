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
  // 2. KINESIOLOGÍA Y STAFF MÉDICO
  // ==========================================

  async getKinesiologos() {
    return await this.supabase.from('kinesiologos').select('*, grupos_kine(grupo_id)').order('apellido', { ascending: true });
  }

  async getKineByEmail(email: string) {
    return await this.supabase.from('kinesiologos').select('id').eq('email', email).maybeSingle();
  }

  async getGruposDeKine(kineId: string) {
    return await this.supabase.from('grupos_kine').select('grupo_id, grupos (*)').eq('kinesiologo_id', kineId);
  }

  async getKinesiologosDeEstudiante(estudianteId: string) {
    const { data: alumno, error: errorAlumno } = await this.supabase.from('estudiantes').select('grupo_id').eq('id', estudianteId).single();
    if (errorAlumno || !alumno?.grupo_id) return { data: null, error: errorAlumno || new Error('Alumno sin grupo') };

    const { data: dataKine, error: errorKine } = await this.supabase.from('grupos_kine').select('kinesiologos (*)').eq('grupo_id', alumno.grupo_id);
    if (errorKine) return { data: null, error: errorKine };

    const kines = dataKine.map(item => item.kinesiologos).filter(k => k !== null);
    return { data: kines, error: null };
  }

  async asignarGrupoAKine(kineId: string, grupoId: string) {
    return await this.supabase.from('grupos_kine').insert({ kinesiologo_id: kineId, grupo_id: grupoId });
  }

  async removerGrupoDeKine(kineId: string, grupoId: string) {
    return await this.supabase.from('grupos_kine').delete().match({ kinesiologo_id: kineId, grupo_id: grupoId });
  }

  // ==========================================
  // 3. EVALUACIONES FÍSICAS (Rendimiento)
  // ==========================================

  // --- Tipos y Rangos ---
  async getTiposEvaluacion() { return await this.supabase.from('tipo_evaluacion').select('*').order('nombre'); }
  async createTipoEvaluacion(dato: any) { return await this.supabase.from('tipo_evaluacion').insert(dato).select(); }
  async updateTipoEvaluacion(id: number, payload: any) { return await this.supabase.from('tipo_evaluacion').update(payload).eq('id', id).select(); }
  async eliminarTipoEvaluacion(id: number) { return await this.supabase.from('tipo_evaluacion').delete().eq('id', id); }

  async getAllRangos() { return await this.supabase.from('evaluacion_rangos').select('*'); }
  
  async getRangosPorTipo(tipoId: number) {
    return await this.supabase.from('evaluacion_rangos').select('*').eq('tipo_evaluacion_id', tipoId)
      .order('edad_min', { ascending: true }).order('valor_min', { ascending: true });
  }

  async createRango(rango: any) { return await this.supabase.from('evaluacion_rangos').insert(rango); }
  async eliminarRango(id: number) { return await this.supabase.from('evaluacion_rangos').delete().eq('id', id); }
  async eliminarRangosPorTipo(tipoId: number) { return await this.supabase.from('evaluacion_rangos').delete().eq('tipo_evaluacion_id', tipoId); }

  // --- Sesiones de Evaluación ---
  async getSesionesEvaluacion() {
    return await this.supabase.from('evaluaciones_sesiones')
      .select('*, grupos!evaluaciones_sesiones_grupo_id_fkey ( nombre ), tipo_evaluacion!evaluaciones_sesiones_tipo_evaluacion_id_fkey ( nombre, unidad_medida )')
      .order('fecha', { ascending: false });
  }

  async getSesionesEvaluacionPorGrupos(grupoIds: (number | string)[]) {
    return await this.supabase.from('evaluaciones_sesiones')
      .select('*, grupos ( nombre ), evaluacion_tipos:tipo_evaluacion_id ( nombre, unidad_medida )') 
      .in('grupo_id', grupoIds).order('fecha', { ascending: false });
  }

  async crearSesionEvaluacion(datos: any) { return await this.supabase.from('evaluaciones_sesiones').insert(datos).select().single(); }
  async updateSesionEvaluacion(id: string, datos: any) { return await this.supabase.from('evaluaciones_sesiones').update(datos).eq('id', id).select(); }
  async eliminarSesionEvaluacion(id: string) { return await this.supabase.from('evaluaciones_sesiones').delete().eq('id', id); }

  // --- Resultados ---
  async getResultadosPorSesion(sesionId: string) { return await this.supabase.from('evaluaciones_resultados').select('*').eq('sesion_id', sesionId); }
  async guardarResultadosMasivos(resultados: any[]) { return await this.supabase.from('evaluaciones_resultados').upsert(resultados, { onConflict: 'sesion_id, estudiante_id' }); }

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

  // Lógica pesada: Cálculo de resultados y rangos del alumno
  async getEvaluacionesAlumno(uid: string, fechaDesde?: string) {
    try {
      const { data: estudiante } = await this.supabase.from('estudiantes').select('fecha_nacimiento').eq('id', uid).single();
      const fechaNac = estudiante?.fecha_nacimiento;

      let query = this.supabase.from('evaluaciones_resultados')
        // 🔥 CAMBIO AQUÍ: Agregamos 'estado,' al select de evaluaciones_sesiones
        .select(`*, evaluaciones_sesiones!inner ( fecha, estado, tipo_evaluacion!inner ( id, nombre, unidad_medida, descripcion, evaluacion_rangos (*) ) )`)
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

        const rangoEncontrado = rangos.find((r: any) => edadAlMomento >= r.edad_min && edadAlMomento <= r.edad_max && valor >= r.valor_min && valor <= r.valor_max);

        let nivelFinal = 'Sin Rango';
        let colorFinal = '#64748b';

        if (edadAlMomento === 0) {
            nivelFinal = 'Falta Edad'; 
        } else if (rangoEncontrado) {
            nivelFinal = rangoEncontrado.nombre_etiqueta;
            colorFinal = rangoEncontrado.color_sugerido;
        }

        return {
          id: res.id, resultado: valor, observacion: res.observacion, fecha: fechaPrueba, created_at: res.created_at,
          // 🔥 CAMBIO AQUÍ: Agregamos el estado
          estado_sesion: res.evaluaciones_sesiones?.estado,
          test_nombre: res.evaluaciones_sesiones?.tipo_evaluacion?.nombre,
          test_descripcion: res.evaluaciones_sesiones?.tipo_evaluacion?.descripcion,
          unidad: res.evaluaciones_sesiones?.tipo_evaluacion?.unidad_medida,
          edad_evaluacion: edadAlMomento, nivel: nivelFinal, color: colorFinal  
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

  // --- Nutricionistas ---
  async getNutricionistas() { return await this.supabase.from('nutricionistas').select('id, nombre, apellido').order('nombre', { ascending: true }); }
  async getNutricionistasCompletos() { return await this.supabase.from('nutricionistas').select('*').order('apellido', { ascending: true }); }
  async getNutriByEmail(email: string) { return await this.supabase.from('nutricionistas').select('id').eq('email', email).maybeSingle(); }

  // --- Tipos de Evaluación ---
  async getTiposEvaluacionNutri() { return await this.supabase.from('tipo_evaluacion_nutri').select('*'); }
  async crearTipoEvaluacionNutri(tipo: { nombre: string, descripcion: string }) { return await this.supabase.from('tipo_evaluacion_nutri').insert(tipo).select().single(); }
  async eliminarTipoEvaluacionNutri(id: string) { return await this.supabase.from('tipo_evaluacion_nutri').delete().eq('id', id); }

  // --- Sesiones de Evaluación ---
  async getEvaluacionesNutri() { return await this.supabase.from('evaluacion_nutri').select('*, tipo_evaluacion:tipo_evaluacion_nutri(nombre)').order('fecha', { ascending: false }); }
  async crearEvaluacionNutri(evaluacion: any) { return await this.supabase.from('evaluacion_nutri').insert(evaluacion).select().single(); }
  async actualizarEvaluacionNutri(id: string, evaluacion: any) { return await this.supabase.from('evaluacion_nutri').update(evaluacion).eq('id', id).select().single(); }
  async eliminarEvaluacionNutri(id: string) { return await this.supabase.from('evaluacion_nutri').delete().eq('id', id); }
  
  async getUltimaEvaluacionNutriFinalizada() {
    return await this.supabase.from('evaluacion_nutri')
      .select('id, fecha, tipo_evaluacion_nutri(nombre)')
      .eq('estado', 'FINALIZADO').order('fecha', { ascending: false }).limit(1).maybeSingle();
  }

  // --- Resultados Nutricionales ---
  async getResultadosPorSesionNutri(sesionId: string) { return await this.supabase.from('evaluacion_resultado_nutri').select('*').eq('evaluacion_id', sesionId); }
  
  async getResultadosNutriEstudiante(estudianteId: string) {
    return await this.supabase.from('evaluacion_resultado_nutri')
      .select('archivo_url, observaciones, evaluacion:evaluacion_nutri ( id, fecha, estado, tipo_evaluacion:tipo_evaluacion_nutri (nombre) )')
      .eq('estudiante_id', estudianteId);
  }

  async guardarResultadoNutri(resultado: any) {
    return await this.supabase.from('evaluacion_resultado_nutri').upsert(resultado, { onConflict: 'evaluacion_id,estudiante_id' }); 
  }

  // ==========================================
  // 5. HISTORIAL CLÍNICO (Lesiones y Antecedentes)
  // ==========================================

  // Obtener el historial de un estudiante
  async getHistorialClinico(estudianteId: string) {
    return await this.supabase
      .from('historial_clinico')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('fecha_evento', { ascending: false });
  }

  // Crear un nuevo registro (lesión, cirugía, etc.)
  async crearHistorialClinico(data: any) {
    return await this.supabase
      .from('historial_clinico')
      .insert(data)
      .select()
      .single();
  }

  // Actualizar un registro existente
  async updateHistorialClinico(id: string, data: any) {
    return await this.supabase
      .from('historial_clinico')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  }

  // Eliminar un registro
  async eliminarHistorialClinico(id: string) {
    return await this.supabase
      .from('historial_clinico')
      .delete()
      .eq('id', id);
  }

  // ==========================================
  // FICHA EVOLUTIVA KINESIOLÓGICA
  // ==========================================

  // 1. Guardar una nueva ficha
  async crearFichaEvolutiva(ficha: any) {
    return await this.supabase
      .from('ficha_evolutiva')
      .insert(ficha)
      .select()
      .single();
  }

  // 2. Actualizar una ficha existente
  async updateFichaEvolutiva(id: string, ficha: any) {
    return await this.supabase
      .from('ficha_evolutiva')
      .update(ficha)
      .eq('id', id)
      .select()
      .single();
  }

  // 3. Obtener todas las fichas de un alumno (para el historial)
  async getFichasPorEstudiante(estudianteId: string) {
    return await this.supabase
      .from('ficha_evolutiva')
      .select(`
        *,
        kinesiologos (nombre, apellido)
      `)
      .eq('estudiante_id', estudianteId)
      .order('fecha_creacion', { ascending: false });
  }

  // 4. Obtener una ficha específica (para ver el detalle o editar)
  async getFichaEvolutivaPorId(id: string) {
    return await this.supabase
      .from('ficha_evolutiva')
      .select('*')
      .eq('id', id)
      .single();
  }

  // 5. Eliminar una ficha (por si hubo un error al crearla)
  async eliminarFichaEvolutiva(id: string) {
    return await this.supabase
      .from('ficha_evolutiva')
      .delete()
      .eq('id', id);
  }
}