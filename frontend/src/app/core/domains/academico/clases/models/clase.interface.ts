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
  /** Solo viene poblado en GET /clases/mis-clases (rol Estudiante) */
  presente?: boolean | null;
}

export interface CrearClasePayload {
  grupoId: number;
  fecha: string;
  hora: string;
  lugar?: string;
  objetivo?: string;
  calentamiento?: string;
  partePrincipal?: string;
  vueltaCalma?: string;
}

export interface ActualizarClasePayload extends Partial<CrearClasePayload> {}

export interface FiltrosClase {
  grupoId?: number;
  desde?: string;
  hasta?: string;
  lugar?: string;
  incluirEliminadas?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionClases {
  registros: Clase[];
  total: number;
  pagina: number;
  limite: number;
}