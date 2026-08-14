export enum Rol {
  ESTUDIANTE = 'estudiante',
  PROFESOR = 'profesor',
  KINESIOLOGO = 'kinesiologo',
  NUTRICIONISTA = 'nutricionista',
  ADMINISTRADOR = 'administrador',
}

export enum Posicion {
  PORTERO = 'portero',
  DEFENSA = 'defensa',
  MEDIOCAMPISTA = 'mediocampista',
  DELANTERO = 'delantero',
}

export interface UsuarioPerfil {
  id_usuario: string;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  foto_url?: string | null; // <-- Te sugiero agregar esto a tu interface
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
  datosEstudiante?: DatosEstudiante;
  datosProfesor?: DatosProfesor;
}

export interface CrearUsuarioPayload {
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  passwordTemporal: string;
  rol: Rol;
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