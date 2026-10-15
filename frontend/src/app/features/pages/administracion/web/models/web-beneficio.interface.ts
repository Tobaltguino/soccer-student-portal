export interface WebBeneficio {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagenUrl: string | null;
  instagramUrl: string | null;
}

export interface CrearWebBeneficioPayload {
  nombre: string;
  descripcion?: string | null;
  orden?: number;
  instagramUrl?: string | null;
}

export type ActualizarWebBeneficioPayload = Partial<CrearWebBeneficioPayload>;