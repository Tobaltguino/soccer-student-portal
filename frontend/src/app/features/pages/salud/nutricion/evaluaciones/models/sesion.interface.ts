import { EstadoSesion } from "../../../../../../shared/enums/estado-sesion.enum";

export interface NutriSesion {
  id: string;
  tipo_id: string;
  nutricionista_id: string;
  fecha: string;
  estado: EstadoSesion;
  created_at: string;
  eliminado_at: string | null;
}

export interface CrearNutriSesionPayload {
  tipoId: string;
  fecha: string;
  nutricionistaId?: string; // Opcional, el admin puede enviarlo para asignar a otro
}

export type ActualizarNutriSesionPayload = Partial<CrearNutriSesionPayload>;

export interface CambiarEstadoNutriSesionPayload {
  estado: EstadoSesion;
}

export interface FiltrosNutriSesiones {
  desde?: string;
  hasta?: string;
  incluirEliminadas?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionNutriSesiones {
  registros: NutriSesion[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ResumenUltimaSesionNutri {
  id: string;
  fecha: string;
  tipoEvaluacion: string;
}