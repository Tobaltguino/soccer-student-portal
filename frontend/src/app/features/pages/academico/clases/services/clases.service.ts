import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  Clase,
  CrearClasePayload,
  ActualizarClasePayload,
  PaginacionClases,
  FiltrosClase
} from '../models/clase.interface';

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private supabase = inject(SupabaseService).client;

  /**
   * Lista las clases permitidas para Admin, Profesor o Kine (paginadas).
   * RLS filtra automáticamente por los grupos asignados según el rol.
   */
  async listarClases(filtros: FiltrosClase = {}): Promise<PaginacionClases> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase
      .from('aca_clases')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: filtros.orden === 'asc' })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined && filtros.grupoId !== null) {
      query = query.eq('grupo_id', filtros.grupoId);
    }

    if (filtros.lugar) {
      const lugarLimpio = filtros.lugar.replace(/[%_]/g, '');
      query = query.ilike('lugar', `%${lugarLimpio}%`);
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
      throw new Error(`No se pudo listar las clases: ${error.message}`);
    }

    return {
      registros: (data ?? []) as Clase[],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  /**
   * Lista exclusiva para el rol Estudiante (incluye el estado 'presente' cruzado con aca_asistencias).
   * Aprovecha la política RLS de aca_clases que trae tanto las de su grupo actual
   * como las históricas donde tenga asistencia registrada.
   */
  async obtenerMisClases(): Promise<Clase[]> {
    const { data: authData } = await this.supabase.auth.getUser();
    const estudianteId = authData?.user?.id;

    if (!estudianteId) {
      throw new Error('Usuario no autenticado');
    }

    // 1. Obtener todas las clases visibles para el estudiante según RLS
    const { data: clases, error: errorClases } = await this.supabase
      .from('aca_clases')
      .select('*')
      .is('eliminado_at', null)
      .order('fecha', { ascending: false });

    if (errorClases) {
      throw new Error(`No se pudo listar tus clases: ${errorClases.message}`);
    }

    const listaClases = (clases ?? []) as Clase[];
    if (listaClases.length === 0) return [];

    // 2. Obtener las asistencias del estudiante para esas clases
    const { data: asistencias, error: errorAsistencias } = await this.supabase
      .from('aca_asistencias')
      .select('clase_id, presente')
      .eq('estudiante_id', estudianteId)
      .in('clase_id', listaClases.map((c) => c.id));

    if (errorAsistencias) {
      throw new Error(`No se pudo obtener tu asistencia: ${errorAsistencias.message}`);
    }

    const mapaAsistencia = new Map<number, boolean>(
      (asistencias ?? []).map((a: any) => [a.clase_id, a.presente])
    );

    return listaClases.map((clase) => ({
      ...clase,
      presente: mapaAsistencia.has(clase.id) ? mapaAsistencia.get(clase.id)! : null,
    }));
  }

  /**
   * Obtiene el detalle de una clase por su ID
   */
  async obtenerClasePorId(id: number): Promise<Clase> {
    const { data, error } = await this.supabase
      .from('aca_clases')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Clase no encontrada o sin permisos de acceso');
    }

    return data as Clase;
  }

  /**
   * Crea una nueva clase (Admin o Profesor en sus grupos asignados).
   * Si no se especifica profesorId, asigna por defecto el usuario autenticado si es profesor.
   */
  async crearClase(payload: CrearClasePayload): Promise<Clase> {
    let profesorId = payload.profesorId ?? null;

    if (!profesorId) {
      const { data: authData } = await this.supabase.auth.getUser();
      profesorId = authData?.user?.id ?? null;
    }

    const { data, error } = await this.supabase
      .from('aca_clases')
      .insert({
        grupo_id: payload.grupoId,
        profesor_id: profesorId,
        fecha: payload.fecha,
        hora: payload.hora,
        lugar: payload.lugar ?? null,
        objetivo: payload.objetivo ?? null,
        calentamiento: payload.calentamiento ?? null,
        parte_principal: payload.partePrincipal ?? null,
        vuelta_calma: payload.vueltaCalma ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la clase: ${error?.message || 'Error desconocido'}`);
    }

    return data as Clase;
  }

  /**
   * Actualiza los datos de una clase existente
   */
  async actualizarClase(id: number, payload: ActualizarClasePayload): Promise<Clase> {
    const updateData: Record<string, any> = {};

    if (payload.grupoId !== undefined) updateData['grupo_id'] = payload.grupoId;
    if (payload.profesorId !== undefined) updateData['profesor_id'] = payload.profesorId;
    if (payload.fecha !== undefined) updateData['fecha'] = payload.fecha;
    if (payload.hora !== undefined) updateData['hora'] = payload.hora;
    if (payload.lugar !== undefined) updateData['lugar'] = payload.lugar;
    if (payload.objetivo !== undefined) updateData['objetivo'] = payload.objetivo;
    if (payload.calentamiento !== undefined) updateData['calentamiento'] = payload.calentamiento;
    if (payload.partePrincipal !== undefined) updateData['parte_principal'] = payload.partePrincipal;
    if (payload.vueltaCalma !== undefined) updateData['vuelta_calma'] = payload.vueltaCalma;

    const { data, error } = await this.supabase
      .from('aca_clases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la clase: ${error?.message || 'Error desconocido'}`);
    }

    return data as Clase;
  }

  /**
   * Eliminación lógica (soft delete) de una clase (Solo Administrador según RLS)
   */
  async eliminarClase(id: number): Promise<Clase> {
    const { data, error } = await this.supabase
      .from('aca_clases')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar la clase: ${error?.message || 'Clase no encontrada'}`);
    }

    return data as Clase;
  }

  /**
   * Restaura una clase eliminada lógicamente (Solo Administrador)
   */
  async restaurarClase(id: number): Promise<Clase> {
    const { data, error } = await this.supabase
      .from('aca_clases')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar la clase: ${error?.message || 'Clase no encontrada'}`);
    }

    return data as Clase;
  }

  /**
   * Obtiene las clases correspondientes al día actual en zona horaria de Chile
   */
  async getClasesHoy(): Promise<any[]> {
    const hoyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const hoyStr =
      hoyDate.getFullYear() +
      '-' +
      String(hoyDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(hoyDate.getDate()).padStart(2, '0');

    const { data, error } = await this.supabase
      .from('aca_clases')
      .select(`
        *,
        grupos:aca_grupos ( nombre )
      `)
      .eq('fecha', hoyStr)
      .is('eliminado_at', null)
      .order('hora', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron obtener las clases de hoy: ${error.message}`);
    }

    return data ?? [];
  }
}