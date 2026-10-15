import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import { AsignacionStaff, AsignarStaffPayload, TipoStaff } from '../models/asignacion-staff.interface';

// Mapeo interno para resolver dinámicamente la tabla y columna según el rol
const CONFIG_STAFF: Record<TipoStaff, { tabla: string; columna: string }> = {
  [TipoStaff.PROFESOR]: { tabla: 'aca_grupos_profesores', columna: 'profesor_id' },
  [TipoStaff.KINESIOLOGO]: { tabla: 'aca_grupos_kinesiologos', columna: 'kinesiologo_id' },
  [TipoStaff.NUTRICIONISTA]: { tabla: 'aca_grupos_nutricionistas', columna: 'nutricionista_id' },
};

@Injectable({
  providedIn: 'root'
})
export class AsignacionStaffService {
  private supabase = inject(SupabaseService).client;

  /**
   * Asigna un profesional a un grupo (Solo Administrador según RLS).
   */
  async asignarStaff(grupoId: number, tipo: TipoStaff, payload: AsignarStaffPayload): Promise<AsignacionStaff> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { data, error } = await this.supabase
      .from(tabla)
      .insert({ grupo_id: grupoId, [columna]: payload.usuarioId })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo asignar el ${tipo} al grupo: ${error?.message || 'Ya está asignado o no existe'}`);
    }

    return this.normalizarAsignacion(data, columna);
  }

  /**
   * Remueve la asignación de un profesional en un grupo (Solo Administrador según RLS).
   */
  async desasignarStaff(grupoId: number, tipo: TipoStaff, usuarioId: string): Promise<void> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { error } = await this.supabase
      .from(tabla)
      .delete()
      .eq('grupo_id', grupoId)
      .eq(columna, usuarioId);

    if (error) {
      throw new Error(`No se pudo desasignar el ${tipo} del grupo: ${error.message}`);
    }
  }

  /**
   * Lista los profesionales asignados a un grupo e incluye sus datos de perfil.
   */
  async listarStaffPorGrupo(grupoId: number, tipo: TipoStaff): Promise<AsignacionStaff[]> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    // Hacemos join dinámico a usu_perfiles usando la columna variable (ej. profesor_id)
    const { data, error } = await this.supabase
      .from(tabla)
      .select(`
        *,
        perfil:usu_perfiles!${tabla}_${columna}_fkey (nombre, apellido, foto_url)
      `)
      .eq('grupo_id', grupoId);

    if (error) {
      throw new Error(`No se pudo listar los ${tipo} del grupo: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.normalizarAsignacion(row, columna));
  }

  /**
   * (Interno) Lista las asignaciones de un usuario específico.
   * Utilizado internamente por grupo.service.ts para saber qué grupos le pertenecen al staff.
   */
  async listarPorUsuario(usuarioId: string, tipo: TipoStaff): Promise<AsignacionStaff[]> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { data, error } = await this.supabase
      .from(tabla)
      .select('*')
      .eq(columna, usuarioId);

    if (error) {
      throw new Error(`No se pudo buscar los grupos del ${tipo}: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.normalizarAsignacion(row, columna));
  }

  /**
   * Convierte la columna dinámica (profesor_id, kinesiologo_id) al estándar 'usuario_id' para el Frontend
   */
  private normalizarAsignacion(row: any, columna: string): AsignacionStaff {
    const perfilRaw = Array.isArray(row.perfil) ? row.perfil[0] : row.perfil;
    
    return {
      grupo_id: row.grupo_id,
      usuario_id: row[columna],
      created_at: row.created_at,
      perfil: perfilRaw || null
    };
  }
}