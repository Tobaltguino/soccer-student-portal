import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { Rol } from '../enums/rol.enum';

@Injectable()
export class AlcanceGruposService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Devuelve los ids de grupo a los que el usuario tiene acceso según su rol.
   * Admin y Nutricionista (por ahora) → null significa "sin restricción, ve todo".
   * Profesor/Kinesiólogo → array de grupoIds asignados (puede ser vacío).
   */
  async obtenerGruposPermitidos(usuarioId: string, rol: Rol): Promise<number[] | null> {
    if (rol === Rol.ADMINISTRADOR) {
        return null; // sin restricción
    }

    let tabla: string;
    let columna: string;

    switch (rol) {
        case Rol.PROFESOR:
        tabla = 'grupos_profesores';
        columna = 'profesor_id';
        break;
        case Rol.KINESIOLOGO:
        tabla = 'grupos_kinesiologos';
        columna = 'kinesiologo_id';
        break;
        case Rol.NUTRICIONISTA:
        tabla = 'grupos_nutricionistas';
        columna = 'nutricionista_id';
        break;
        default:
        return []; // rol sin alcance de grupos (ej. estudiante, admin ya cubierto arriba)
    }

    const { data, error } = await this.supabase.client
        .from(tabla)
        .select('grupo_id')
        .eq(columna, usuarioId);

    if (error) return [];

    return (data ?? []).map((row: any) => row.grupo_id);
    }
}