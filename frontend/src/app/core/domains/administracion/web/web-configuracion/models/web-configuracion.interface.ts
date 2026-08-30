export interface WebConfiguracion {
  id: number;
  telefono: string | null;
  correo: string | null;
  instagramNombre: string | null; // 🔥 Todo a camelCase
  instagramUrl: string | null;
  facebookNombre: string | null;
  facebookUrl: string | null;
  whatsappMensaje: string | null;
  heroTitulo: string | null;
  heroSubtitulo: string | null;
}

export interface ActualizarWebConfiguracionPayload {
  telefono?: string;
  correo?: string;
  instagramNombre?: string;
  instagramUrl?: string;
  facebookNombre?: string;
  facebookUrl?: string;
  whatsappMensaje?: string;
  heroTitulo?: string;
  heroSubtitulo?: string;
}

export interface LandingData {
  configuracion: WebConfiguracion;
  metodologias: any[];
  programas: any[];
  auspiciadores: any[];
  beneficios: any[];
}
