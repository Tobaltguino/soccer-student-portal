export type TipoHistorialClinico = 'ALERGIA' | 'PATOLOGIA' | 'LESION';
export type EstadoHistorialClinico =
  | 'EN_OBSERVACION'
  | 'EN_TRATAMIENTO'
  | 'EN_REINTEGRO_DEPORTIVO'
  | 'RECUPERADO';

export interface HistorialClinicoRow {
  id: number;
  estudiante_id: string;
  tipo: TipoHistorialClinico;
  diagnostico: string | null;
  fecha_evento: string;
  estado: EstadoHistorialClinico;
  observaciones: string | null;
  created_at: string;
}