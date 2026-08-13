import { Role } from './role.enum'; // Importamos el enum

export interface LoginCredentials {
  rut: string;
  password?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    rut: string;
    role: Role;
    necesitaAceptarTerminos: boolean; 
  };
}