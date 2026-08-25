export interface ResultadoRow {
  id: number;
  sesion_id: string;
  estudiante_id: string;
  valor_numerico: number;
  observacion: string | null;
  created_at: string;
  updated_at: string;
}

// Resultado enriquecido con la info del rango calculado (no se guarda en la tabla,
// se calcula al vuelo combinando evaluaciones_resultados + evaluacion_rangos)
export interface ResultadoConRango extends ResultadoRow {
  rango: {
    nombreEtiqueta: string;
    colorSugerido: string | null;
  } | null;
}

export interface ResultadoConDetalle extends ResultadoRow {
  rango: {
    nombreEtiqueta: string;
    colorSugerido: string | null;
  } | null;
  edadEvaluacion: number | null;
  evaluacion: {
    nombre: string;
    unidadMedida: string;
    descripcion: string | null;
    fecha: string;
  };
}