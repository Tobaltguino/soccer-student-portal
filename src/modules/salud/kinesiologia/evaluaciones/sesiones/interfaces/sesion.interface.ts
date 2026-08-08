export type EstadoKineSesion = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export interface KineSesionRow {
  id: string;
  tipo_evaluacion_id: number;
  grupo_id: number;
  kinesiologo_id: string;
  fecha: string;
  estado: EstadoKineSesion;
  observacion: string | null;
  created_at: string;
  eliminado_at: string | null;
}