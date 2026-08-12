export interface KineSubevaluacion {
  id: number;
  tipo_evaluacion_id: number;
  nombre: string;
  evalua_lados: boolean;
  created_at: string;
}

export interface CrearKineSubevaluacionPayload {
  tipoEvaluacionId: number;
  nombre: string;
  evaluaLados?: boolean;
}

export type ActualizarKineSubevaluacionPayload = Partial<CrearKineSubevaluacionPayload>;