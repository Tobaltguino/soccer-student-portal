import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role.enum';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtenemos los roles permitidos para esta ruta desde la configuración
  const expectedRoles = route.data['roles'] as Array<Role>;
  const userRole = authService.getUserRole() as Role;

  // Si el usuario no tiene un rol válido para esta vista, lo devolvemos al login
  if (!userRole || !expectedRoles.includes(userRole)) {
    console.warn('Acceso denegado: Rol insuficiente');
    // Opcional: Podrías redirigirlo a una página de "403 No Autorizado" en el futuro
    router.navigate(['/auth/login']); 
    return false;
  }

  return true; // El rol coincide, lo dejamos pasar
};