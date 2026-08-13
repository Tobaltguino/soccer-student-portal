import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const jwtGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // El usuario tiene token, lo dejamos pasar
  }

  // No hay token, lo pateamos a la pantalla de login
  router.navigate(['/auth/login']);
  return false;
};