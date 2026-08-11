export interface TipoEvaluacion {
  id: number;
  nombre: string;
  unidad_medida: string;
  descripcion: string | null;
  created_at: string;
}

export interface CrearTipoEvaluacionPayload {
  nombre: string;
  unidadMedida: string;
  descripcion?: string;
}

export type ActualizarTipoEvaluacionPayload = Partial<CrearTipoEvaluacionPayload>;