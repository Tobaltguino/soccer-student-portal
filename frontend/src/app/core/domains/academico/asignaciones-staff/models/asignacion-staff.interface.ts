export enum TipoStaff {
  PROFESOR = 'profesores',
  KINESIOLOGO = 'kinesiologos',
  NUTRICIONISTA = 'nutricionistas'
}

export interface AsignacionStaff {
  grupo_id: number;
  usuario_id: string;
  created_at: string;
}

export interface AsignarStaffPayload {
  usuarioId: string;
}