import { Genero } from "../../../../../../shared/enums/genero.enum";

export interface RangoEvaluacion {
  id: number;
  tipo_evaluacion_id: number;
  genero: Genero; // 🔥 NUEVO
  nombre_etiqueta: string;
  valor_min: number;
  valor_max: number;
  edad_min: number;
  edad_max: number;
  color_sugerido: string | null;
  created_at: string;
}

export interface CrearRangoPayload {
  tipoEvaluacionId: number;
  genero: Genero; // 🔥 NUEVO
  nombreEtiqueta: string;
  valorMin: number;
  valorMax: number;
  edadMin: number;
  edadMax: number;
  colorSugerido?: string;
}

export type ActualizarRangoPayload = Partial<CrearRangoPayload>;