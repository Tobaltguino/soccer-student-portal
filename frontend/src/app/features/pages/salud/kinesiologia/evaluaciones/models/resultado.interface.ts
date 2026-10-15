import { CriterioPrioridad } from "./subevaluacion.interface";

export interface KineResultado {
  id: number;
  sesion_id: string;
  estudiante_id: string;
  subevaluacion_id: number;
  resultado_unico: string | null;
  resultado_izquierdo: string | null;
  resultado_derecho: string | null;
  observacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface KineResultadoConDetalle extends KineResultado {
  subevaluacion: {
    nombre: string;
    evaluaLados: boolean;
    prioridad: CriterioPrioridad | null;
  };
  rango: {
    etiqueta: string;
    color: string | null;
  } | null;
  alumno: {
    nombre: string;
    apellido: string;
    rut: string;
  };
}

export interface CrearKineResultadoPayload {
  sesionId: string;
  estudianteId: string;
  subevaluacionId: number;
  resultadoUnico?: string | null;
  resultadoIzquierdo?: string | null;
  resultadoDerecho?: string | null;
  observacion?: string | null;
}

export type ActualizarKineResultadoPayload = Partial<Omit<CrearKineResultadoPayload, 'sesionId' | 'estudianteId' | 'subevaluacionId'>>;