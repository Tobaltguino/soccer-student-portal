import { EstadoSesion } from '../../../../../../../shared/enums/estado-sesion.enum';

export interface KineSesion {
  id: string;
  tipo_evaluacion_id: number;
  grupo_id: number;
  kinesiologo_id: string;
  fecha: string;
  estado: EstadoSesion;
  observacion: string | null;
  created_at: string;
  eliminado_at: string | null;
}

export interface CrearKineSesionPayload {
  tipoEvaluacionId: number;
  grupoId: number;
  fecha: string;
  observacion?: string;
}

export interface ActualizarKineSesionPayload {
  fecha?: string;
  observacion?: string;
}

export interface CambiarEstadoKineSesionPayload {
  estado: EstadoSesion;
}

export interface FiltrosKineSesiones {
  grupoId?: number;
  desde?: string;
  hasta?: string;
  incluirEliminadas?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionKineSesiones {
  registros: KineSesion[];
  total: number;
  pagina: number;
  limite: number;
}