import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  KineSesion,
  CrearKineSesionPayload,
  ActualizarKineSesionPayload,
  CambiarEstadoKineSesionPayload,
  FiltrosKineSesiones,
  PaginacionKineSesiones
} from '../models/kine-sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineSesionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva sesión de evaluación kinesiológica para un grupo.
   */
  async crearSesion(payload: CrearKineSesionPayload): Promise<KineSesion> {
    const { userId, gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();

    if (gruposPermitidos !== null && !gruposPermitidos.includes(payload.grupoId)) {
      throw new Error('No puedes crear sesiones en un grupo que no tienes asignado');
    }

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .insert({
        tipo_evaluacion_id: payload.tipoEvaluacionId,
        grupo_id: payload.grupoId,
        kinesiologo_id: userId,
        fecha: payload.fecha,
        estado: 'PROGRAMADA',
        observacion: payload.observacion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la sesión: ${error?.message || 'El tipo de evaluación o grupo no existe'}`);
    }

    return data as KineSesion;
  }

  /**
   * Lista de sesiones con filtros y paginación. Applica filtros de alcance (RLS lógico) según el rol.
   */
  async listarSesiones(filtros: FiltrosKineSesiones = {}): Promise<PaginacionKineSesiones> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();
    
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 1000); // 1000 = máximo de filas por petición en Supabase
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase
      .from('kine_evaluaciones_sesiones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    // Lógica de filtrado por grupos
    if (filtros.grupoId !== undefined) {
      if (gruposPermitidos !== null && !gruposPermitidos.includes(filtros.grupoId)) {
        return { registros: [], total: 0, pagina, limite };
      }
      query = query.eq('grupo_id', filtros.grupoId);
    } else if (gruposPermitidos !== null) {
      if (gruposPermitidos.length === 0) return { registros: [], total: 0, pagina, limite };
      query = query.in('grupo_id', gruposPermitidos);
    }

    if (filtros.desde) query = query.gte('fecha', filtros.desde);
    if (filtros.hasta) query = query.lte('fecha', filtros.hasta);
    if (!filtros.incluirEliminadas) query = query.is('eliminado_at', null);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`No se pudo listar las sesiones: ${error.message}`);
    }

    return {
      registros: (data ?? []) as KineSesion[],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  /**
   * Busca el detalle de una sesión específica validando que el usuario tenga acceso.
   */
  async obtenerSesionPorId(id: string): Promise<KineSesion> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Sesión no encontrada');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new Error('No tienes permisos para ver esta sesión');
    }

    return data as KineSesion;
  }

  /**
   * Actualiza datos generales (fecha u observación) de la sesión.
   */
  async actualizarSesion(id: string, payload: ActualizarKineSesionPayload): Promise<KineSesion> {
    // Valida existencia y alcance
    await this.obtenerSesionPorId(id);

    const updateData: Record<string, any> = {};
    if (payload.fecha !== undefined) updateData['fecha'] = payload.fecha;
    if (payload.observacion !== undefined) updateData['observacion'] = payload.observacion;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la sesión: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineSesion;
  }

  /**
   * Cambia el estado (PROGRAMADA, EN_CURSO, FINALIZADA, CANCELADA) de la sesión.
   */
  async cambiarEstado(id: string, payload: CambiarEstadoKineSesionPayload): Promise<KineSesion> {
    await this.obtenerSesionPorId(id);

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .update({ estado: payload.estado })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo cambiar el estado de la sesión: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineSesion;
  }

  /**
   * Elimina lógicamente (soft-delete) una sesión (Solo Administrador).
   */
  async eliminarSesion(id: string): Promise<KineSesion> {
    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as KineSesion;
  }

  /**
   * Restaura una sesión eliminada previamente (Solo Administrador).
   */
  async restaurarSesion(id: string): Promise<KineSesion> {
    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as KineSesion;
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA CONTROL DE ACCESO
  // =========================================================================
  private async obtenerDatosYGruposPermitidos(): Promise<{ userId: string; rol: string; gruposPermitidos: number[] | null }> {
    const { data: authData } = await this.supabase.auth.getUser();
    const userId = authData?.user?.id;
    
    if (!userId) {
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    const { data: perfil } = await this.supabase
      .from('usu_perfiles')
      .select('rol')
      .eq('id_usuario', userId)
      .maybeSingle();

    const rol = (perfil?.rol || '').toLowerCase();
    
    // El administrador tiene acceso a todos los grupos (null)
    if (rol === 'administrador') {
      return { userId, rol, gruposPermitidos: null };
    }

    // Para el resto del staff, buscamos explícitamente sus grupos
    const tabla = rol === 'profesor' ? 'aca_grupos_profesores' : 'aca_grupos_kinesiologos';
    const columna = rol === 'profesor' ? 'profesor_id' : 'kinesiologo_id';

    const { data: gruposData } = await this.supabase
      .from(tabla)
      .select('grupo_id')
      .eq(columna, userId);

    const gruposPermitidos = (gruposData ?? []).map((r: any) => r.grupo_id);

    return { userId, rol, gruposPermitidos };
  }
}