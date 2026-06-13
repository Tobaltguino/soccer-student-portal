import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

// 🚀 Importamos el nuevo AuthService de dominio
import { AuthService } from '../services/auth.service'; 

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // 1. Verificamos si hay una sesión activa usando el AuthService
  const { data: { user } } = await authService.getUser();

  if (!user || !user.email) {
    // Si no está logueado, lo pateamos al login de inmediato
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificamos los roles permitidos para esta ruta
  const rolesPermitidos = route.data['roles'] as Array<string>;
  
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    
    // 🔥 NUEVA LÓGICA: Si la ruta permite 'all', lo dejamos pasar de inmediato
    // (Esto ahorra una consulta a la BD y permite entrar a terminos o update-password)
    if (rolesPermitidos.includes('all')) {
      return true;
    }

    // 🚀 MAGIA DE SEGURIDAD: Le preguntamos al AuthService el rol real
    const rolReal = await authService.getRolSeguro(user.email); 

    if (!rolesPermitidos.includes(rolReal)) {
      // Si el rol REAL no coincide con el permitido, lo devolvemos a su casa
      console.warn(`🛑 Acceso denegado: Eres '${rolReal}' intentando entrar a zona de '${rolesPermitidos.join(', ')}'`);
      
      // Construimos la ruta segura basada en su rol real
      const rutaSegura = (rolReal && rolReal !== 'login') ? `/${rolReal}/dashboard` : '/login';
      router.navigate([rutaSegura]);
      return false;
    }
  }

  // Si pasa todo, le damos acceso a la ruta
  return true;
};