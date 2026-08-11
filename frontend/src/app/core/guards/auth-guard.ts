import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service'; 

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);

  // 1. Verificamos si hay una sesión activa en Supabase
  const { data: { session } } = await supabase.supabase.auth.getSession();

  if (!session) {
    // Si no está logueado, lo pateamos al login de inmediato
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificamos los roles permitidos para esta ruta
  const rolesPermitidos = route.data['roles'] as Array<string>;
  
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    
    // 🚀 MAGIA DE SEGURIDAD: Le preguntamos al servicio (BD o Memoria), NO al localStorage
    const rolReal = await supabase.getRolSeguro(session.user.id); 

    if (!rolesPermitidos.includes(rolReal)) {
      // Si el rol REAL no coincide con el permitido, lo devolvemos a su casa
      console.warn('Acceso denegado: Intento de violación de roles detectado.');
      
      // Construimos la ruta segura basada en su rol real
      const rutaSegura = rolReal ? `/${rolReal}/dashboard` : '/login';
      router.navigate([rutaSegura]);
      return false;
    }
  }

  // Si pasa todo, le damos acceso a la ruta
  return true;
};