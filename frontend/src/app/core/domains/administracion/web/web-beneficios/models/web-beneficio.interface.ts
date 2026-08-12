export interface WebBeneficio {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagen_url: string | null;
  instagram_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrearWebBeneficioPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
  instagramUrl?: string;
}

export type ActualizarWebBeneficioPayload = Partial<CrearWebBeneficioPayload>;