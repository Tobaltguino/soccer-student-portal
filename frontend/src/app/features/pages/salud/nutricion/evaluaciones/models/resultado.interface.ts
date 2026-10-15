export interface NutriResultado {
  id: string;
  evaluacion_id: string;
  estudiante_id: string;
  archivo_url: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutriResultadoConDetalle extends NutriResultado {
  evaluacion: {
    nombre: string;
    fecha: string;
  };
}

export interface CrearNutriResultadoPayload {
  evaluacionId: string;
  estudianteId: string;
  observaciones?: string | null;
}

export type ActualizarNutriResultadoPayload = Partial<Pick<CrearNutriResultadoPayload, 'observaciones'>>;