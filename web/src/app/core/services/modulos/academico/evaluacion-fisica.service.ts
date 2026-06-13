import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class EvaluacionFisicaService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // DASHBOARD & ACTIVIDAD
  // ==========================================

  async getActividadReciente() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select('*, grupos(nombre), tipo_evaluacion(nombre)')
      .order('created_at', { ascending: false })
      .limit(5);
  }

  // ==========================================
  // CONFIGURACIÓN: TIPOS Y RANGOS
  // ==========================================

  async getTiposEvaluacion() { 
    return await this.supabase.from('tipo_evaluacion').select('*').order('nombre'); 
  }
  async createTipoEvaluacion(dato: any) { 
    return await this.supabase.from('tipo_evaluacion').insert(dato).select(); 
  }
  async updateTipoEvaluacion(id: number, payload: any) { 
    return await this.supabase.from('tipo_evaluacion').update(payload).eq('id', id).select(); 
  }
  async eliminarTipoEvaluacion(id: number) { 
    return await this.supabase.from('tipo_evaluacion').delete().eq('id', id); 
  }

  async getAllRangos() { 
    return await this.supabase.from('evaluacion_rangos').select('*'); 
  }
  
  async getRangosPorTipo(tipoId: number) {
    return await this.supabase.from('evaluacion_rangos').select('*').eq('tipo_evaluacion_id', tipoId)
      .order('edad_min', { ascending: true }).order('valor_min', { ascending: true });
  }

  async createRango(rango: any) { 
    return await this.supabase.from('evaluacion_rangos').insert(rango); 
  }
  async eliminarRango(id: number) { 
    return await this.supabase.from('evaluacion_rangos').delete().eq('id', id); 
  }
  async eliminarRangosPorTipo(tipoId: number) { 
    return await this.supabase.from('evaluacion_rangos').delete().eq('tipo_evaluacion_id', tipoId); 
  }

  // ==========================================
  // SESIONES DE EVALUACIÓN
  // ==========================================

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

  async crearSesionEvaluacion(datos: any) { 
    return await this.supabase.from('evaluaciones_sesiones').insert(datos).select().single(); 
  }
  async updateSesionEvaluacion(id: string, datos: any) { 
    return await this.supabase.from('evaluaciones_sesiones').update(datos).eq('id', id).select(); 
  }
  async eliminarSesionEvaluacion(id: string) { 
    return await this.supabase.from('evaluaciones_sesiones').delete().eq('id', id); 
  }

  // ==========================================
  // RESULTADOS Y CALIFICACIONES
  // ==========================================

  async getResultadosPorSesion(sesionId: string) { 
    return await this.supabase.from('evaluaciones_resultados').select('*').eq('sesion_id', sesionId); 
  }
  
  async guardarResultadosMasivos(resultados: any[]) { 
    return await this.supabase.from('evaluaciones_resultados').upsert(resultados, { onConflict: 'sesion_id, estudiante_id' }); 
  }

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
  // CONSULTAS DE ALUMNOS (Lógica Pesada)
  // ==========================================

  async getEvaluacionesAlumno(uid: string, fechaDesde?: string) {
    try {
      const { data: estudiante } = await this.supabase.from('estudiantes').select('fecha_nacimiento').eq('id', uid).single();
      const fechaNac = estudiante?.fecha_nacimiento;

      let query = this.supabase.from('evaluaciones_resultados')
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

}