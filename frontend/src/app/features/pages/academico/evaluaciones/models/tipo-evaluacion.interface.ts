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
  descripcion?: string | null;
}

export type ActualizarTipoEvaluacionPayload = Partial<CrearTipoEvaluacionPayload>;