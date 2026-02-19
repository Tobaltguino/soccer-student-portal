import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service'; // Ajusta la ruta a tu servicio

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);

  // 1. Verificamos si hay una sesión activa en Supabase
  const { data: { session } } = await supabase.supabase.auth.getSession();

  if (!session) {
    // Si no está logueado, lo pateamos al login
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificamos los roles permitidos para esta ruta
  const rolesPermitidos = route.data['roles'] as Array<string>;
  
  // Asumimos que guardaste el rol en el localStorage al hacer login
  // Ej: localStorage.setItem('userRole', 'admin');
  const rolActual = localStorage.getItem('userRole'); 

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (!rolActual || !rolesPermitidos.includes(rolActual)) {
      // Si está logueado pero no tiene el rol, lo mandamos a su propio dashboard
      const rutaSegura = rolActual ? `/${rolActual}/dashboard` : '/login';
      router.navigate([rutaSegura]);
      return false;
    }
  }

  // Si pasa todo, le damos acceso a la ruta
  return true;
};