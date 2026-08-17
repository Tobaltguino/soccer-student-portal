import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast'; // <-- 1. IMPORTAMOS EL MÓDULO VISUAL
import { MessageService } from 'primeng/api';

import { IdleService } from './core/services/idle.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule, ToastModule], // <-- 2. LO AGREGAMOS AQUÍ
  providers: [MessageService],
  templateUrl: './app.html', 
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy { 
  title = 'ProFutbol';

  constructor(
    private idleService: IdleService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.checkThemePreference();

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