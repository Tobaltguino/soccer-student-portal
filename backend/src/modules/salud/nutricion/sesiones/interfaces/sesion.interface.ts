export type EstadoNutriSesion = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export interface NutriSesionRow {
  id: string;
  tipo_id: string;
  nutricionista_id: string;
  fecha: string;
  estado: EstadoNutriSesion;
  created_at: string;
  eliminado_at: string | null;
}