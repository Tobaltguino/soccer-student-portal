export interface WebAuspiciador {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagenUrl: string | null;
  instagramUrl: string | null;
}

export interface CrearWebAuspiciadorPayload {
  nombre: string;
  descripcion?: string | null;
  orden?: number;
  instagramUrl?: string | null;
}

export type ActualizarWebAuspiciadorPayload = Partial<CrearWebAuspiciadorPayload>;