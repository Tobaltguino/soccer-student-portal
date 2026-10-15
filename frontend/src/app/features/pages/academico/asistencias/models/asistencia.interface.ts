export interface Asistencia {
  clase_id: number;
  estudiante_id: string;
  presente: boolean;
  created_at?: string;
}

export interface MarcarAsistenciaPayload {
  estudianteId: string;
  presente: boolean;
}

export interface RegistrarAsistenciasLotePayload {
  asistencias: MarcarAsistenciaPayload[];
}

export interface ReporteAsistenciaMensual {
  estudiante_id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  foto_url: string | null;
  total_clases: number;
  total_presentes: number;
  porcentaje: number;
  resumen: string;
}

export interface DetalleAsistenciaDiaria {
  presente: boolean;
  fecha: string;
  hora: string;
  lugar: string | null;
}