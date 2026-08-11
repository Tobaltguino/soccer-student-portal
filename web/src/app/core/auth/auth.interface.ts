import { Role } from './role.enum'; // Importamos el enum

export interface LoginCredentials {
  rut: string; // Cambiamos email por rut
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: Role; // Usamos el enum aquí
  };
}