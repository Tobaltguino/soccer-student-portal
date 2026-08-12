export interface KineRango {
  id: number;
  subevaluacion_id: number;
  puntaje: number;
  etiqueta: string;
  color: string | null;
  descripcion: string | null;
  created_at: string;
}

export interface CrearKineRangoPayload {
  subevaluacionId: number;
  puntaje: number;
  etiqueta: string;
  color?: string;
  descripcion?: string;
}

export type ActualizarKineRangoPayload = Partial<CrearKineRangoPayload>;