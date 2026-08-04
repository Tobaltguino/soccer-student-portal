export interface MaterialRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  archivo_url: string;
  tipo_material: string;
  grupo_id: number | null;
  clase_id: number | null;
  creado_por: string | null;
  created_at: string;
}