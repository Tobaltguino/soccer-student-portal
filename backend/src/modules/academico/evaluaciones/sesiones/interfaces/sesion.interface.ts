export type EstadoSesion = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export interface SesionRow {
  id: string;
  tipo_evaluacion_id: number;
  grupo_id: number;
  creado_por: string | null;
  fecha: string;
  estado: EstadoSesion;
  created_at: string;
  eliminado_at: string | null;
}