export type TipoProfesor = 'preparador fisico' | 'profesor de futbol';

export interface Profesor {
  usuario_id: string;
  tipo_profesor: TipoProfesor | null;
}

export interface ActualizarProfesorPayload {
  tipoProfesor?: TipoProfesor;
}