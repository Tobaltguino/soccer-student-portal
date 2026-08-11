export interface ResultadoBase {
  id: number;
  sesion_id: string;
  estudiante_id: string;
  valor_numerico: number;
  observacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface RangoInfo {
  nombreEtiqueta: string;
  colorSugerido: string | null;
}

export interface ResultadoConRango extends ResultadoBase {
  rango: RangoInfo | null;
}

export interface ResultadoConDetalle extends ResultadoBase {
  rango: RangoInfo | null;
  evaluacion: {
    nombre: string;
    unidadMedida: string;
    fecha: string;
  };
}

export interface CrearResultadoPayload {
  sesionId: string;
  estudianteId: string;
  valorNumerico: number;
  observacion?: string;
}

export type ActualizarResultadoPayload = Partial<Omit<CrearResultadoPayload, 'sesionId' | 'estudianteId'>>;