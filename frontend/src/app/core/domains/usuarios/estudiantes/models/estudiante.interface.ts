import { Posicion, UsuarioPerfil } from '../../central/models/usuario.interface';

export interface Estudiante {
  usuario_id: string;
  peso: number | null;
  altura: number | null;
  posiciones: Posicion[] | null;
  direccion: string | null;
  prevision: string | null;
  grupo_id: number | null;
}

export interface EstudianteConPerfil extends Estudiante {
  perfil: UsuarioPerfil;
}

export interface ActualizarEstudiantePayload {
  peso?: number;
  altura?: number;
  posiciones?: Posicion[];
  direccion?: string;
  prevision?: string;
  grupoId?: number;
}

export interface FiltrosEstudiantes {
  busqueda?: string;
  grupoIds?: number[];
  posiciones?: Posicion[];
  activo?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionEstudiantes {
  registros: EstudianteConPerfil[];
  total: number;
  pagina: number;
  limite: number;
}