export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
  eliminado_at: string | null;
  created_at: string;

  /** Relación cruda devuelta por Supabase al hacer select('*, estudiantes:usu_estudiantes(count)') */
  estudiantes?: { count: number }[];
  /** Propiedad calculada automáticamente por el servicio para usar directo en la tabla HTML */
  cantidad_alumnos?: number;
}

export interface CrearGrupoPayload {
  nombre: string;
  descripcion?: string | null;
}

export type ActualizarGrupoPayload = Partial<CrearGrupoPayload>;