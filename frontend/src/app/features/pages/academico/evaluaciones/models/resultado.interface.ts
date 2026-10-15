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
  edadEvaluacion?: number | null;
  evaluacion?: {
    nombre: string;
    unidadMedida: string;
    descripcion: string | null;
    fecha: string;
  };
}

export interface ResultadoConDetalle extends ResultadoBase {
  rango: RangoInfo | null;
  edadEvaluacion: number | null;
  evaluacion: {
    nombre: string;
    unidadMedida: string;
    descripcion?: string | null;
    fecha: string;
  };
}

export interface CrearResultadoPayload {
  sesionId: string;
  estudianteId: string;
  valorNumerico: number;
  observacion?: string | null;
}

export type ActualizarResultadoPayload = Partial<Omit<CrearResultadoPayload, 'sesionId' | 'estudianteId'>>;

export interface FilaExcelResultadoSesion {
  rut: string;
  nombreCompleto: string;
  edad: number | string;
  resultado: string;
  rango: string;
  observacion: string;
  nombreEvaluacion: string;
}