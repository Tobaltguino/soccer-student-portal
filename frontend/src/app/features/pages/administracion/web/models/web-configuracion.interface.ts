import { WebMetodologia } from './web-metodologia.interface';
import { WebPrograma } from './web-programa.interface';
import { WebAuspiciador } from './web-auspiciador.interface';
import { WebBeneficio } from './web-beneficio.interface';

export interface WebConfiguracion {
  id: number;
  telefono: string | null;
  correo: string | null;
  instagramNombre: string | null;
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
  metodologias: WebMetodologia[];
  programas: WebPrograma[];
  auspiciadores: WebAuspiciador[];
  beneficios: WebBeneficio[];
}