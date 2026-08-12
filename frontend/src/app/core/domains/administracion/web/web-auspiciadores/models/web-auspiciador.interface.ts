export interface WebAuspiciador {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagen_url: string | null;
  instagram_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrearWebAuspiciadorPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
  instagramUrl?: string;
}

// Para actualizar, todos los campos son opcionales
export type ActualizarWebAuspiciadorPayload = Partial<CrearWebAuspiciadorPayload>;