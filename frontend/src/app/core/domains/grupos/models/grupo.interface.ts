export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
  eliminado_at: string | null;
  created_at: string;
}

export interface CrearGrupoPayload {
  nombre: string;
  descripcion?: string;
}

// Partial hace que nombre y descripcion sean opcionales para la actualización
export type ActualizarGrupoPayload = Partial<CrearGrupoPayload>;