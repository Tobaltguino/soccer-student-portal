import { EstadoSesion } from "../../../../../../shared/enums/estado-sesion.enum";

export interface SesionEvaluacion {
  id: string;
  tipo_evaluacion_id: number;
  grupo_id: number;
  creado_por: string | null;
  fecha: string;
  estado: EstadoSesion;
  created_at: string;
  eliminado_at: string | null;
}

export interface CrearSesionPayload {
  tipoEvaluacionId: number;
  grupoId: number;
  fecha: string;
  estado?: EstadoSesion;
}

export type ActualizarSesionPayload = Partial<CrearSesionPayload>;

export interface CambiarEstadoSesionPayload {
  estado: EstadoSesion;
}

export interface FiltrosSesiones {
  grupoId?: number;
  desde?: string;
  hasta?: string;
  incluirEliminadas?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionSesiones {
  registros: SesionEvaluacion[];
  total: number;
  pagina: number;
  limite: number;
}