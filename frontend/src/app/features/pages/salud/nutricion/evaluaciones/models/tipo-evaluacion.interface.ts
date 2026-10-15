export interface NutriTipoEvaluacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface CrearNutriTipoEvaluacionPayload {
  nombre: string;
  descripcion?: string | null;
}

export type ActualizarNutriTipoEvaluacionPayload = Partial<CrearNutriTipoEvaluacionPayload>;