import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app'; // <--- Importamos la clase 'App' del archivo 'app.ts'

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));