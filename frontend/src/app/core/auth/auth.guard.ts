import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Verificamos si hay una sesión activa
  const session = authService.authState().session;

  if (session) {
    return true;
  }

  // Si no hay sesión, redirigimos al login
  return router.createUrlTree(['/auth/login']);
};