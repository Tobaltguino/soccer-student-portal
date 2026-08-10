export interface WebAuspiciadorRow {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagen_url: string | null;
  instagram_url: string | null;
  created_at: string;
  updated_at: string;
}