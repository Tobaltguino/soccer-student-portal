export type CriterioPrioridad = 'MENOR' | 'MAYOR';

export interface SubevaluacionRow {
  id: number;
  tipo_evaluacion_id: number;
  nombre: string;
  evalua_lados: boolean;
  prioridad: CriterioPrioridad | null;
  created_at: string;
}