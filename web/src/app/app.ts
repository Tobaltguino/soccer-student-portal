import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast'; 
import { MessageService } from 'primeng/api';

import { IdleService } from './core/services/idle.service'; 
// 🚀 CAMBIO 1: Importamos AuthService en lugar del servicio viejo
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule, ToastModule], 
  providers: [MessageService],
  templateUrl: './app.html', 
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy { 
  title = 'ProFutbol';

  constructor(
    private idleService: IdleService,
    // 🚀 CAMBIO 2: Inyectamos AuthService
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.checkThemePreference();

    // 🚀 CAMBIO 3: Usamos el cliente de Supabase expuesto a través de AuthService
    // Vigilar el estado de la sesión para activar o desactivar el contador de inactividad
    this.authService.supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.idleService.iniciarMonitoreo();
      } else {
        this.idleService.detenerMonitoreo();
      }
    });

    // 2. Mostrar la alerta cuando expira la sesión
    this.idleService.onIdleTimeout.subscribe(() => {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesión Expirada',
        detail: 'Por tu seguridad, la sesión se cerró por inactividad.',
        life: 6000 
      });
    });
  }

  ngOnDestroy() {
    this.idleService.detenerMonitoreo();
  }

  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}