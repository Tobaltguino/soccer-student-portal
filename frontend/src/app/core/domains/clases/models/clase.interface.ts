export interface Clase {
  id: number;
  grupo_id: number;
  profesor_id: string | null;
  fecha: string;
  hora: string;
  lugar: string | null;
  objetivo: string | null;
  calentamiento: string | null;
  parte_principal: string | null;
  vuelta_calma: string | null;
  eliminado_at: string | null;
  created_at: string;
}

export interface CrearClasePayload {
  grupoId: number;
  profesorId?: string;
  fecha: string;
  hora: string;
  lugar?: string;
  objetivo?: string;
  calentamiento?: string;
  partePrincipal?: string;
  vueltaCalma?: string;
}

// Partial hace que todos los campos de CrearClasePayload sean opcionales (Igual que PartialType en Nest)
export type ActualizarClasePayload = Partial<CrearClasePayload>; 

export interface PaginacionClases {
  registros: Clase[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltrosClase {
  grupoId?: number;
  desde?: string;
  hasta?: string;
  incluirEliminadas?: boolean;
  pagina?: number;
  limite?: number;
}