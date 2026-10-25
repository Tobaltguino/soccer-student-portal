import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperamos a que Supabase restaure la sesión guardada (si no, F5 expulsa al usuario)
  await authService.ready();
  const session = authService.authState().session;

  if (!session) {
    return router.createUrlTree(['/login']);
  }

  // Mientras use la clave temporal (RUT) no puede entrar al portal
  if (authService.debeCambiarPassword(session)) {
    return router.createUrlTree(['/update-password']);
  }

  return true;
};
