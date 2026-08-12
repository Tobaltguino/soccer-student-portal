export interface WebConfiguracion {
  id: number;
  telefono: string | null;
  correo: string | null;
  instagram_nombre: string | null;
  instagram_url: string | null;
  facebook_nombre: string | null;
  facebook_url: string | null;
  whatsapp_mensaje: string | null;
  hero_titulo: string | null;
  hero_subtitulo: string | null;
  created_at: string;
  updated_at: string;
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
  configuracion: any;
  metodologias: any[];
  programas: any[];
  auspiciadores: any[];
  beneficios: any[];
}