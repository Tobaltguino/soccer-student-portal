export interface Asistencia {
  clase_id: number;
  estudiante_id: string;
  presente: boolean;
  created_at: string;
}

export interface MarcarAsistenciaPayload {
  estudianteId: string;
  presente: boolean;
}

export interface RegistrarAsistenciasLotePayload {
  asistencias: MarcarAsistenciaPayload[];
}