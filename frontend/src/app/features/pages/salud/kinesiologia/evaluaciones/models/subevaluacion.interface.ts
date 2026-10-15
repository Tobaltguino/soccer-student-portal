export type CriterioPrioridad = 'MENOR' | 'MAYOR';

export interface KineSubevaluacion {
  id: number;
  tipo_evaluacion_id: number;
  nombre: string;
  evalua_lados: boolean;
  prioridad: CriterioPrioridad | null;
  created_at: string;
}

export interface CrearKineSubevaluacionPayload {
  tipoEvaluacionId: number;
  nombre: string;
  evaluaLados?: boolean;
  prioridad?: CriterioPrioridad | null;
}

export type ActualizarKineSubevaluacionPayload = Partial<CrearKineSubevaluacionPayload>;