import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast'; 
import { MessageService } from 'primeng/api';


import { IdleService } from './core/services/idle.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule, ToastModule], 
  providers: [MessageService],
  templateUrl: './app.html', 
  styleUrl: './app.scss' // 🔥 Cambiado a .scss
})
export class App implements OnInit, OnDestroy { 
  title = 'ProFutbol';

  constructor(
    private idleService: IdleService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.checkThemePreference();

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

  // ==========================================
  // GESTIÓN DE TEMA (Alineado con el Global CSS)
  // ==========================================
  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Si guardó 'light', o si no hay nada guardado y su sistema prefiere claro
    if (savedTheme === 'light' || (!savedTheme && !systemPrefersDark)) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }
}