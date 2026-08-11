import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes'; // Tus rutas
import { jwtInterceptor } from './core/interceptors/jwt.interceptor'; // Tu nuevo interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Así le dices a Angular que use tu interceptor para todas las peticiones
    provideHttpClient(withInterceptors([jwtInterceptor]))
  ]
};