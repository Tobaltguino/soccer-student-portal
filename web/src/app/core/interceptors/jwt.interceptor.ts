import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Recuperamos el token donde sea que lo estés guardando 
  // (aquí asumo localStorage, pero podría ser sessionStorage o un Signal/Service)
  const token = localStorage.getItem('access_token');

  // 2. Si el token existe, clonamos la petición original y le inyectamos el header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    // Pasamos la petición modificada al siguiente nivel
    return next(authReq);
  }

  // 3. Si no hay token (por ejemplo, al iniciar sesión), la petición sigue igual
  return next(req);
};