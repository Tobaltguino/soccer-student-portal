import type { CriterioPrioridad } from '../../subevaluaciones/interfaces/subevaluacion.interface';

export interface KineResultadoRow {
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

export interface KineResultadoConDetalle extends KineResultadoRow {
  subevaluacion: {
    nombre: string;
    evaluaLados: boolean;
    prioridad: CriterioPrioridad | null;
  };
  rango: {
    etiqueta: string;
    color: string | null;
  } | null;
  // 🔥 AGREGAMOS EL ALUMNO AL TIPO DE DATO
  alumno: {
    nombre: string;
    apellido: string;
    rut: string;
  };
}