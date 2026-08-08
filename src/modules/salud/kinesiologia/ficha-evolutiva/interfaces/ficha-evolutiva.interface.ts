export interface FichaEvolutivaRow {
  id: string;
  estudiante_id: string;
  kinesiologo_id: string;
  fecha_evaluacion: string;
  antecedentes_personales: Record<string, any> | null;
  antecedentes_remotos: Record<string, any> | null;
  diagnostico_medico: string | null;
  inspeccion_estatica: Record<string, any> | null;
  inspeccion_dinamica: Record<string, any> | null;
  rango_movimiento: any[] | null;
  fuerza_movimientos: any[] | null;
  postura: Record<string, any> | null;
  sensibilidad: Record<string, any> | null;
  marcha: string | null;
  coordinacion: Record<string, any> | null;
  balance_romberg: number | null;
  observacion: string | null;
  no_evaluable: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  eliminado_at: string | null;
}