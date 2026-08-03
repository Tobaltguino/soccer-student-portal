export interface ClaseRow {
  id: number;
  grupo_id: number;
  profesor_id: string | null;
  fecha: string;
  hora: string;
  lugar: string | null;
  objetivo: string | null;
  calentamiento: string | null;
  parte_principal: string | null;
  vuelta_calma: string | null;
  created_at: string;
}