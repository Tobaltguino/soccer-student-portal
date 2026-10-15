export interface KineTipoEvaluacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface CrearKineTipoEvaluacionPayload {
  nombre: string;
  descripcion?: string | null;
}

export type ActualizarKineTipoEvaluacionPayload = Partial<CrearKineTipoEvaluacionPayload>;