import { Session, User } from '@supabase/supabase-js';
import { Rol } from '../../shared/enums/rol.enum';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: Rol; // Usamos el enum directamente aquí
  nombre?: string;
}