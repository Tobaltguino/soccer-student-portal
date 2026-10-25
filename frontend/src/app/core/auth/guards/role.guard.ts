import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Obtenemos los roles permitidos configurados en el app.routes.ts
  const rolesPermitidos = route.data['roles'] as Array<string>;

  // Si la ruta no tiene restricción de roles, dejamos pasar
  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return true;
  }

  try {
    // 2. Verificamos la sesión actual usando tu servicio
    const session = await authService.obtenerSesionActual();
    
    if (!session?.user) {
      return router.createUrlTree(['/login']);
    }

    // 3. Obtenemos el perfil del usuario para saber su rol real en la base de datos
    const perfil = await authService.obtenerPerfilUsuario(session.user.id);
    const rolUsuario = perfil?.rol?.toLowerCase();

    // 4. Comparamos el rol del usuario con los permitidos en la ruta
    if (rolUsuario && rolesPermitidos.includes(rolUsuario)) {
      return true; // Acceso concedido
    }

    // 5. Si no tiene permiso, lo devolvemos a su inicio para evitar que vea páginas no autorizadas
    return router.createUrlTree(['/inicio']);

  } catch (error) {
    console.error('Error validando permisos de rol:', error);
    return router.createUrlTree(['/login']);
  }
};