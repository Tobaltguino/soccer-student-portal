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
  /** Solo viene poblado en obtenerMisClases() (rol Estudiante) */
  presente?: boolean | null;
  /** Relación opcional cuando se consulta con join a aca_grupos (ej. getClasesHoy) */
  aca_grupos?: { nombre: string } | null;
}

export interface CrearClasePayload {
  grupoId: number;
  profesorId?: string | null;
  fecha: string;
  hora: string;
  lugar?: string | null;
  objetivo?: string | null;
  calentamiento?: string | null;
  partePrincipal?: string | null;
  vueltaCalma?: string | null;
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
  /** 'asc' para orden cronológico (ej. calendario), 'desc' para más reciente primero (default) */
  orden?: 'asc' | 'desc';
}

export interface PaginacionClases {
  registros: Clase[];
  total: number;
  pagina: number;
  limite: number;
}