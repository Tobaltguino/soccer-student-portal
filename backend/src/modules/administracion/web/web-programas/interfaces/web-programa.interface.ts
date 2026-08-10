export interface WebProgramaRow {
  id: number;
  icono: string;
  color_fondo: string | null;
  color_texto: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}