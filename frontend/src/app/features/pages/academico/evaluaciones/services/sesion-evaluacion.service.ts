import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  SesionEvaluacion,
  CrearSesionPayload,
  ActualizarSesionPayload,
  CambiarEstadoSesionPayload,
  FiltrosSesiones,
  PaginacionSesiones,
  ResumenUltimaSesion
} from '../models/sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class SesionEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva sesión de evaluación para un grupo (Admin, Profesor según RLS).
   * Registra automáticamente el usuario autenticado en 'creado_por'.
   */
  async crearSesion(payload: CrearSesionPayload): Promise<SesionEvaluacion> {
    const { data: authData } = await this.supabase.auth.getUser();
    const creadoPor = authData?.user?.id ?? null;

    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .insert({
        tipo_evaluacion_id: payload.tipoEvaluacionId,
        grupo_id: payload.grupoId,
        fecha: payload.fecha,
        estado: payload.estado ?? 'PROGRAMADA',
        creado_por: creadoPor,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la sesión de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as SesionEvaluacion;
  }

  /**
   * Lista sesiones con filtros y paginación.
   * RLS filtra automáticamente por los grupos permitidos según el rol.
   */
  async listarSesiones(filtros: FiltrosSesiones = {}): Promise<PaginacionSesiones> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase
      .from('aca_evaluaciones_sesiones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined && filtros.grupoId !== null) {
      query = query.eq('grupo_id', filtros.grupoId);
    }

    if (filtros.desde) {
      query = query.gte('fecha', filtros.desde);
    }

    if (filtros.hasta) {
      query = query.lte('fecha', filtros.hasta);
    }

    if (!filtros.incluirEliminadas) {
      query = query.is('eliminado_at', null);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`No se pudo listar las sesiones: ${error.message}`);
    }

    return {
      registros: (data ?? []) as SesionEvaluacion[],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  /**
   * Busca el detalle de una sesión específica por su ID.
   */
  async obtenerSesionPorId(id: string): Promise<SesionEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Sesión de evaluación no encontrada');
    }

    return data as SesionEvaluacion;
  }

  /**
   * Actualiza los datos generales de la sesión (Admin, Profesor en sus grupos).
   */
  async actualizarSesion(id: string, payload: ActualizarSesionPayload): Promise<SesionEvaluacion> {
    const updateData: Record<string, any> = {};

    if (payload.tipoEvaluacionId !== undefined) updateData['tipo_evaluacion_id'] = payload.tipoEvaluacionId;
    if (payload.grupoId !== undefined) updateData['grupo_id'] = payload.grupoId;
    if (payload.fecha !== undefined) updateData['fecha'] = payload.fecha;
    if (payload.estado !== undefined) updateData['estado'] = payload.estado;

    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la sesión: ${error?.message || 'Error desconocido'}`);
    }

    return data as SesionEvaluacion;
  }

  /**
   * Cambia rápidamente el estado (PROGRAMADA, EN_CURSO, FINALIZADA, CANCELADA) de la sesión.
   */
  async cambiarEstado(id: string, payload: CambiarEstadoSesionPayload): Promise<SesionEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .update({ estado: payload.estado })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo cambiar el estado: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as SesionEvaluacion;
  }

  /**
   * Elimina lógicamente (soft-delete) una sesión (Solo Administrador).
   */
  async eliminarSesion(id: string): Promise<SesionEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as SesionEvaluacion;
  }

  /**
   * Restaura una sesión eliminada previamente (Solo Administrador).
   */
  async restaurarSesion(id: string): Promise<SesionEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as SesionEvaluacion;
  }

  /**
   * Obtiene el resumen de la última sesión de evaluación con estado FINALIZADA
   * dentro del alcance de grupos del usuario logueado.
   */
  async obtenerUltimaSesionFinalizada(): Promise<ResumenUltimaSesion | null> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_sesiones')
      .select(`
        id,
        fecha,
        estado,
        tipo_evaluacion:aca_tipo_evaluacion ( nombre ),
        grupo:aca_grupos ( nombre ),
        resultados:aca_evaluaciones_resultados ( count )
      `)
      .eq('estado', 'FINALIZADA')
      .is('eliminado_at', null)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo obtener la última sesión finalizada: ${error.message}`);
    }

    if (!data) return null;

    const tipoEvalObj = Array.isArray(data.tipo_evaluacion) ? data.tipo_evaluacion[0] : data.tipo_evaluacion;
    const grupoObj = Array.isArray(data.grupo) ? data.grupo[0] : data.grupo;

    return {
      id: data.id,
      fecha: data.fecha,
      tipoEvaluacion: (tipoEvalObj as any)?.nombre || 'Evaluación',
      grupo: (grupoObj as any)?.nombre || 'Sin Grupo',
      totalResultados: (data.resultados as any)?.[0]?.count || 0
    };
  }
}