import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { TipoStaff } from '../../../shared/enums/tipo-staff.enum';
import type { AsignacionRow } from './interfaces/asignacion.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';

// Mapea cada tipo de staff a su tabla y nombre de columna real en la BD
const CONFIG_STAFF: Record<TipoStaff, { tabla: string; columna: string }> = {
  [TipoStaff.PROFESOR]: { tabla: 'grupos_profesores', columna: 'profesor_id' },
  [TipoStaff.KINESIOLOGO]: { tabla: 'grupos_kinesiologos', columna: 'kinesiologo_id' },
  [TipoStaff.NUTRICIONISTA]: { tabla: 'grupos_nutricionistas', columna: 'nutricionista_id' },
};

@Injectable()
export class AsignacionesStaffService {
  constructor(private readonly supabase: SupabaseService) {}

  async asignar(
    grupoId: number,
    usuarioId: string,
    tipo: TipoStaff,
  ): Promise<AsignacionRow> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { data, error } = await this.supabase.client
      .from(tabla)
      .insert({ grupo_id: grupoId, [columna]: usuarioId })
      .select()
      .single();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        `No se pudo asignar el ${tipo} al grupo`,
        `El grupo o el ${tipo} indicado no existe, o ya está asignado`,
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la asignación creada');
    }

    return this.normalizar(data, columna);
  }

  async desasignar(grupoId: number, usuarioId: string, tipo: TipoStaff): Promise<void> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { error } = await this.supabase.client
      .from(tabla)
      .delete()
      .eq('grupo_id', grupoId)
      .eq(columna, usuarioId);

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo desasignar el ${tipo} del grupo: ${error.message}`,
      );
    }
  }

  async listarPorGrupo(grupoId: number, tipo: TipoStaff): Promise<AsignacionRow[]> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { data, error } = await this.supabase.client
      .from(tabla)
      .select('*')
      .eq('grupo_id', grupoId);

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar ${tipo}s del grupo: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => this.normalizar(row, columna));
  }

  async listarPorUsuario(usuarioId: string, tipo: TipoStaff): Promise<AsignacionRow[]> {
    const { tabla, columna } = CONFIG_STAFF[tipo];

    const { data, error } = await this.supabase.client
      .from(tabla)
      .select('*')
      .eq(columna, usuarioId);

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar los grupos del ${tipo}: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => this.normalizar(row, columna));
  }

  private normalizar(row: any, columna: string): AsignacionRow {
    return {
      grupo_id: row.grupo_id,
      usuario_id: row[columna],
      created_at: row.created_at,
    };
  }
}