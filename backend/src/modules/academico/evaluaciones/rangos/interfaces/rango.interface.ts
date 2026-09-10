import { Genero } from '../../../../../shared/enums/genero.enum';

export interface RangoRow {
  id: number;
  tipo_evaluacion_id: number;
  genero: Genero;
  nombre_etiqueta: string;
  valor_min: number;
  valor_max: number;
  edad_min: number;
  edad_max: number;
  color_sugerido: string | null;
  created_at: string;
}