export interface WebMetodologia {
  id: number;
  icono: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
}

export interface CrearWebMetodologiaPayload {
  icono: string;
  titulo: string;
  descripcion?: string;
  orden?: number;
}

export type ActualizarWebMetodologiaPayload = Partial<CrearWebMetodologiaPayload>;
