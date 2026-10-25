import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import {
  Grupo,
  CrearGrupoPayload,
  ActualizarGrupoPayload
} from '../models/grupo.interface';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Lista los grupos permitidos para el usuario actual.
   * - Si es Administrador: devuelve todos los grupos.
   * - Si es Staff (Profesor, Kinesiólogo, Nutricionista): devuelve solo sus grupos asignados.
   * - Incluye el conteo de estudiantes inscritos (usu_estudiantes).
   */
  async listarGrupos(incluirEliminados: boolean = false): Promise<Grupo[]> {
    let gruposAsignadosIds: number[] | null = null;

    // Rol y grupos salen de la caché de AuthService (antes: 3 consultas en cada pantalla)
    const rol = await this.authService.obtenerRolActual();

    if (rol === 'profesor' || rol === 'kinesiologo' || rol === 'nutricionista') {
      gruposAsignadosIds = await this.authService.obtenerGruposStaff();
      if (gruposAsignadosIds.length === 0) {
        return [];
      }
    }

    let query = this.supabase
      .from('aca_grupos')
      .select('*, estudiantes:usu_estudiantes(count)')
      .order('nombre', { ascending: true });

    if (!incluirEliminados) {
      query = query.is('eliminado_at', null);
    }

    if (gruposAsignadosIds !== null) {
      query = query.in('id', gruposAsignadosIds);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`No se pudo listar los grupos: ${error.message}`);
    }

    return (data ?? []).map((g: any) => this.mapearConteoAlumnos(g));
  }

  /**
   * Devuelve únicamente los grupos activos a los que el Staff (Profesor/Kine/Nutri) está asignado.
   */
  async obtenerMisGrupos(): Promise<Grupo[]> {
    return this.listarGrupos(false);
  }

  /**
   * Obtiene el detalle de un grupo específico por su ID.
   */
  async obtenerGrupoPorId(id: number): Promise<Grupo> {
    const { data, error } = await this.supabase
      .from('aca_grupos')
      .select('*, estudiantes:usu_estudiantes(count)')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Grupo no encontrado');
    }

    return this.mapearConteoAlumnos(data);
  }

  /**
   * Crea un nuevo grupo (Solo Administrador según RLS).
   */
  async crearGrupo(payload: CrearGrupoPayload): Promise<Grupo> {
    const { data, error } = await this.supabase
      .from('aca_grupos')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el grupo: ${error?.message || 'Error desconocido'}`);
    }

    return { ...(data as Grupo), cantidad_alumnos: 0 };
  }

  /**
   * Actualiza los datos de un grupo (Solo Administrador según RLS).
   */
  async actualizarGrupo(id: number, payload: ActualizarGrupoPayload): Promise<Grupo> {
    const updateData: Record<string, any> = {};

    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;

    const { data, error } = await this.supabase
      .from('aca_grupos')
      .update(updateData)
      .eq('id', id)
      .select('*, estudiantes:usu_estudiantes(count)')
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el grupo: ${error?.message || 'Grupo no encontrado'}`);
    }

    return this.mapearConteoAlumnos(data);
  }

  /**
   * Eliminación lógica (soft-delete) de un grupo (Solo Administrador según RLS).
   */
  async eliminarGrupo(id: number): Promise<Grupo> {
    const { data, error } = await this.supabase
      .from('aca_grupos')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar el grupo: ${error?.message || 'Grupo no encontrado'}`);
    }

    return data as Grupo;
  }

  /**
   * Restaura un grupo eliminado lógicamente (Solo Administrador según RLS).
   */
  async restaurarGrupo(id: number): Promise<Grupo> {
    const { data, error } = await this.supabase
      .from('aca_grupos')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select('*, estudiantes:usu_estudiantes(count)')
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar el grupo: ${error?.message || 'Grupo no encontrado'}`);
    }

    return this.mapearConteoAlumnos(data);
  }

  // =========================================================================
  // MÉTODOS PRIVADOS AUXILIARES
  // =========================================================================

  private mapearConteoAlumnos(grupoRaw: any): Grupo {
    const count = grupoRaw.estudiantes?.[0]?.count ?? 0;
    return {
      ...grupoRaw,
      cantidad_alumnos: count
    };
  }
}