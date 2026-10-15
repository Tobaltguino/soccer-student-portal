export enum TipoHistorialClinico {
  ALERGIA = 'ALERGIA',
  PATOLOGIA = 'PATOLOGIA',
  LESION = 'LESION',
}

export enum EstadoHistorialClinico {
  EN_OBSERVACION = 'EN_OBSERVACION',
  EN_TRATAMIENTO = 'EN_TRATAMIENTO',
  EN_REINTEGRO_DEPORTIVO = 'EN_REINTEGRO_DEPORTIVO',
  RECUPERADO = 'RECUPERADO',
}

export interface HistorialClinico {
  id: number;
  estudiante_id: string;
  tipo: TipoHistorialClinico;
  diagnostico: string | null;
  fecha_evento: string;
  estado: EstadoHistorialClinico;
  observaciones: string | null;
  created_at: string;
  eliminado_at: string | null;
}

export interface CrearHistorialPayload {
  estudianteId: string;
  tipo: TipoHistorialClinico;
  diagnostico?: string | null;
  fechaEvento: string;
  estado?: EstadoHistorialClinico;
  observaciones?: string | null;
}

export type ActualizarHistorialPayload = Partial<Omit<CrearHistorialPayload, 'estudianteId'>>;