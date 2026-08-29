// AJUSTA esta ruta a donde tengas realmente el modelo de subevaluación en tu proyecto
import { CriterioPrioridad } from '../../subevaluaciones/models/subevaluacion.interface';

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
}

export interface CrearKineResultadoPayload {
  sesionId: string;
  estudianteId: string;
  subevaluacionId: number;
  resultadoUnico?: string;
  resultadoIzquierdo?: string;
  resultadoDerecho?: string;
  observacion?: string;
}

export interface ActualizarKineResultadoPayload {
  resultadoUnico?: string;
  resultadoIzquierdo?: string;
  resultadoDerecho?: string;
  observacion?: string;
}