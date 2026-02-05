import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // Importar animaciones
import { providePrimeNG } from 'primeng/config'; // Importar configuración
import Aura from '@primeng/themes/aura'; // Importar el tema Aura

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(), // Activar animaciones
    providePrimeNG({
        theme: {
            preset: Aura,
            options: {
                darkModeSelector: false || 'none' // Opcional: Esto fuerza el modo claro por defecto
            }
        }
    })
  ]
};