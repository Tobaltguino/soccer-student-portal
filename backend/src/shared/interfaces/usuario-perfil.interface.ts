import { Rol } from '../enums/rol.enum';
import { Genero } from '../enums/genero.enum'; // 🔥 Importar Enum
import type { EstudianteRow } from '../../modules/usuarios/estudiantes/interfaces/estudiante.interface';
import type { ProfesorRow } from '../../modules/usuarios/profesores/interfaces/profesor.interface';

export interface UsuarioPerfilRow {
  id_usuario: string;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  genero: Genero; // 🔥 Nueva propiedad
  telefono: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioPerfilCompleto extends UsuarioPerfilRow {
  datosEstudiante?: EstudianteRow;
  datosProfesor?: ProfesorRow;
  grupos_asignados?: any[]; 
}