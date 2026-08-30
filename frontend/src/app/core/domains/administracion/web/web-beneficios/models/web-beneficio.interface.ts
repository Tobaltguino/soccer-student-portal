export interface WebBeneficio {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  imagenUrl: string | null;    // 🔥 Cambiado a camelCase
  instagramUrl: string | null; // 🔥 Cambiado a camelCase
}

export interface CrearWebBeneficioPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
  instagramUrl?: string;
}

export type ActualizarWebBeneficioPayload = Partial<CrearWebBeneficioPayload>;