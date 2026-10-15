import { Rol } from '../../../../../shared/enums/rol.enum';
import { Posicion } from '../../../../../shared/enums/posicion.enum';
import { Genero } from '../../../../../shared/enums/genero.enum';

export { Posicion, Rol, Genero };

export interface UsuarioPerfil {
  id_usuario: string;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  genero: Genero;
  foto_url?: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  activo: boolean;
  created_at: string;
}

export interface DatosEstudiante {
  usuario_id: string;
  peso: number | null;
  altura: number | null;
  posiciones: Posicion[] | null;
  direccion: string | null;
  prevision: string | null;
  grupo_id: number | null;
}

export interface DatosProfesor {
  usuario_id: string;
  tipo_profesor: string | null;
}

export interface UsuarioPerfilCompleto extends UsuarioPerfil {
  datosEstudiante?: DatosEstudiante | null;
  datosProfesor?: DatosProfesor | null;
  grupos_asignados?: any[];
}

export interface CrearUsuarioPayload {
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  passwordTemporal: string;
  rol: Rol;
  genero: Genero;
  telefono?: string;
  fechaNacimiento?: string;
  
  // Específicos Estudiante
  peso?: number;
  altura?: number;
  posiciones?: Posicion[];
  direccion?: string;
  prevision?: string;
  grupoId?: number;

  // Específicos Profesor
  tipoProfesor?: string;
}

export type ActualizarUsuarioPayload = Partial<Omit<CrearUsuarioPayload, 'passwordTemporal' | 'rol'>>;

export interface FiltrosUsuarios {
  rol?: Rol;
  busqueda?: string;
  grupoIds?: number[];
  posiciones?: Posicion[];
  tipoProfesor?: string[];
  generos?: Genero[];
  activo?: boolean;
  pagina?: number;
  limite?: number;
}

export interface PaginacionUsuarios {
  registros: UsuarioPerfilCompleto[];
  total: number;
  pagina: number;
  limite: number;
}