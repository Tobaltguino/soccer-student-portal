import { TipoMaterial } from '../../../../../shared/enums/tipo-material.enum';

export interface Material {
  id: string;
  titulo: string;
  descripcion: string | null;
  archivo_url: string;
  tipo_material: TipoMaterial;
  grupo_id: number | null;
  clase_id: number | null;
  creado_por: string | null;
  created_at: string;
}

export interface CrearMaterialPayload {
  titulo: string;
  descripcion?: string | null;
  tipoMaterial: TipoMaterial;
  grupoId?: number | null;
  claseId?: number | null;
}

export type ActualizarMaterialPayload = Partial<CrearMaterialPayload>;

export interface FiltrosMaterial {
  grupoId?: number;
  claseId?: number;
  tipoMaterial?: TipoMaterial;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface PaginacionMaterial {
  registros: Material[];
  total: number;
  pagina: number;
  limite: number;
}