export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
  eliminado_at: string | null;
  created_at: string;
  
  estudiantes?: { count: number }[]; // Así es como viene crudo desde Supabase
  cantidad_alumnos?: number; // Así es como lo usamos en la tabla HTML
}

export interface CrearGrupoPayload {
  nombre: string;
  descripcion?: string;
}

// Partial hace que nombre y descripcion sean opcionales para la actualización
export type ActualizarGrupoPayload = Partial<CrearGrupoPayload>;