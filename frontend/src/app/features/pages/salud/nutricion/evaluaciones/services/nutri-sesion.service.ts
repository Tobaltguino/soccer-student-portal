import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import {
  NutriSesion,
  CrearNutriSesionPayload,
  ActualizarNutriSesionPayload,
  CambiarEstadoNutriSesionPayload,
  FiltrosNutriSesiones,
  PaginacionNutriSesiones,
  ResumenUltimaSesionNutri
} from '../models/sesion.interface';

@Injectable({
  providedIn: 'root'
})
export class NutriSesionService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Crea una nueva sesión nutricional.
   * Si es administrador, puede asignar el 'nutricionista_id', de lo contrario usa su propio ID.
   */
  async crearSesion(payload: CrearNutriSesionPayload): Promise<NutriSesion> {
    const { userId, rol } = await this.obtenerDatosAutenticacion();
    
    const nutricionistaId = (rol === 'administrador' && payload.nutricionistaId) 
      ? payload.nutricionistaId 
      : userId;

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .insert({
        tipo_id: payload.tipoId,
        nutricionista_id: nutricionistaId,
        fecha: payload.fecha,
        estado: 'PROGRAMADA',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la sesión: ${error?.message || 'El tipo de evaluación o nutricionista indicado no existe'}`);
    }

    return data as NutriSesion;
  }

  /**
   * Lista las sesiones con paginación y filtros. 
   * Filtra automáticamente por nutricionista si el usuario no es administrador.
   */
  async listarSesiones(filtros: FiltrosNutriSesiones = {}): Promise<PaginacionNutriSesiones> {
    const { userId, rol } = await this.obtenerDatosAutenticacion();
    
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 1000); // 1000 = máximo de filas por petición en Supabase
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase
      .from('nutri_evaluacion_sesiones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    // Los nutricionistas ven solo sus sesiones, los admins y el resto del staff ven todas (si el RLS lo permite)
    if (rol === 'nutricionista') {
      query = query.eq('nutricionista_id', userId);
    }

    if (filtros.desde) query = query.gte('fecha', filtros.desde);
    if (filtros.hasta) query = query.lte('fecha', filtros.hasta);
    if (!filtros.incluirEliminadas) query = query.is('eliminado_at', null);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`No se pudo listar las sesiones: ${error.message}`);
    }

    return {
      registros: (data ?? []) as NutriSesion[],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  /**
   * Busca el detalle de una sesión específica.
   */
  async obtenerSesionPorId(id: string): Promise<NutriSesion> {
    const { userId, rol } = await this.obtenerDatosAutenticacion();

    let query = this.supabase
      .from('nutri_evaluacion_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null);

    if (rol === 'nutricionista') {
      query = query.eq('nutricionista_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new Error('Sesión no encontrada o no tienes permisos para verla');
    }

    return data as NutriSesion;
  }

  /**
   * Actualiza los datos logísticos de la sesión (Solo Admin o el Nutricionista propietario).
   */
  async actualizarSesion(id: string, payload: ActualizarNutriSesionPayload): Promise<NutriSesion> {
    const { rol } = await this.obtenerDatosAutenticacion();
    
    // Verificamos propiedad de la sesión internamente llamando a buscarPorId
    await this.obtenerSesionPorId(id);

    const updateData: Record<string, any> = {};
    if (payload.tipoId !== undefined) updateData['tipo_id'] = payload.tipoId;
    if (payload.fecha !== undefined) updateData['fecha'] = payload.fecha;
    if (rol === 'administrador' && payload.nutricionistaId !== undefined) {
      updateData['nutricionista_id'] = payload.nutricionistaId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la sesión: ${error?.message || 'Error desconocido'}`);
    }

    return data as NutriSesion;
  }

  /**
   * Cambia el estado de la sesión (PROGRAMADA, EN_CURSO, FINALIZADA, CANCELADA).
   */
  async cambiarEstado(id: string, payload: CambiarEstadoNutriSesionPayload): Promise<NutriSesion> {
    await this.obtenerSesionPorId(id);

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .update({ estado: payload.estado })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo cambiar el estado: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as NutriSesion;
  }

  /**
   * Retorna la última sesión nutricional que haya concluido.
   */
  async obtenerUltimaFinalizada(): Promise<ResumenUltimaSesionNutri | null> {
    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .select(`
        id,
        fecha,
        estado,
        tipo_evaluacion:nutri_tipo_evaluacion ( nombre )
      `)
      .eq('estado', 'FINALIZADA')
      .is('eliminado_at', null)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo obtener la última evaluación: ${error.message}`);
    }

    if (!data) return null;

    const tipoEval = Array.isArray(data.tipo_evaluacion) ? data.tipo_evaluacion[0] : data.tipo_evaluacion;

    return {
      id: data.id,
      fecha: data.fecha,
      tipoEvaluacion: (tipoEval as any)?.nombre || 'Evaluación Nutricional',
    };
  }

  /**
   * Elimina lógicamente (soft-delete) una sesión nutricional.
   */
  async eliminarSesion(id: string): Promise<NutriSesion> {
    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as NutriSesion;
  }

  /**
   * Restaura una sesión nutricional eliminada previamente.
   */
  async restaurarSesion(id: string): Promise<NutriSesion> {
    const { data, error } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar la sesión: ${error?.message || 'Sesión no encontrada'}`);
    }

    return data as NutriSesion;
  }

  // =========================================================================
  // HELPER PARA ROLES Y AUTENTICACIÓN
  // =========================================================================
  private async obtenerDatosAutenticacion(): Promise<{ userId: string; rol: string }> {
    // Usuario y rol salen de la caché de AuthService
    const userId = await this.authService.obtenerUsuarioId();
    return { userId, rol: await this.authService.obtenerRolActual() };
  }
}