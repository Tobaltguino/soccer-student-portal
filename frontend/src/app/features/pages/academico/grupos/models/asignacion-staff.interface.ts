export enum TipoStaff {
  PROFESOR = 'profesores',
  KINESIOLOGO = 'kinesiologos',
  NUTRICIONISTA = 'nutricionistas'
}

export interface AsignacionStaff {
  grupo_id: number;
  usuario_id: string;
  created_at: string;
  
  // Propiedad agregada para mostrar en la interfaz directamente
  perfil?: {
    nombre: string;
    apellido: string;
    foto_url: string | null;
  } | null;
}

export interface AsignarStaffPayload {
  usuarioId: string;
}