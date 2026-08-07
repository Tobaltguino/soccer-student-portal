export interface NutriResultadoRow {
  id: string;
  evaluacion_id: string;
  estudiante_id: string;
  archivo_url: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutriResultadoConDetalle extends NutriResultadoRow {
  evaluacion: {
    nombre: string;
    fecha: string;
  };
}