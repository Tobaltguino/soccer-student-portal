import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject, firstValueFrom } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  
  // Cambia esta línea:
  // private timeoutMilliseconds = 15 * 60 * 1000; 

  // Por esta (10 segundos en milisegundos):
  private timeoutMilliseconds = 10 * 1000;

  private idleSubscription: Subscription | null = null;
  public onIdleTimeout = new Subject<boolean>();

  // --- VARIABLES PARA EL DETECTOR DE SUSPENSIÓN ---
  private suspensionInterval: any;
  private ultimoTick: number = Date.now();
  private margenSuspension = 10000; // 10 segundos

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private authService: AuthService
  ) {}

  iniciarMonitoreo() {
    if (this.idleSubscription) return;

    // Ejecutamos fuera de Angular para no saturar el Change Detection con cada movimiento del mouse
    this.ngZone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'scroll')
      );

      this.idleSubscription = activityEvents$.pipe(
        startWith(null), 
        switchMap(() => timer(this.timeoutMilliseconds))
      ).subscribe(() => {
        // Volvemos a entrar a Angular solo cuando pasan los 15 min
        this.ngZone.run(() => {
          this.cerrarSesionPorInactividad();
        });
      });

      this.iniciarDetectorSuspension();
    });
  }

  // ==========================================
  // DETECTOR DE SUSPENSIÓN (PC DORMIDO)
  // ==========================================
  private iniciarDetectorSuspension() {
    this.ultimoTick = Date.now();
    
    this.suspensionInterval = setInterval(() => {
      const ahora = Date.now();
      const diferencia = ahora - this.ultimoTick;

      if (diferencia > this.margenSuspension) {
        this.verificarSesionAlDespertar();
      }

      this.ultimoTick = ahora;
    }, 2000); 
  }

  private async verificarSesionAlDespertar() {
    try {
      // Validamos con NestJS si el token sigue vivo
      const res = await firstValueFrom(this.authService.me());
      
      if (!res) {
        this.ngZone.run(() => this.cerrarSesionPorInactividad());
      }
    } catch (error) {
      this.ngZone.run(() => this.cerrarSesionPorInactividad());
    }
  }
  // ==========================================

  detenerMonitoreo() {
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
      this.idleSubscription = null;
    }
    if (this.suspensionInterval) {
      clearInterval(this.suspensionInterval);
      this.suspensionInterval = null;
    }
  }

  private async cerrarSesionPorInactividad() {
    this.detenerMonitoreo();
    this.onIdleTimeout.next(true);

    try {
      if (this.authService.logout) {
        await firstValueFrom(this.authService.logout());
      }
    } catch (error) {
      console.warn('Error al cerrar sesión en el backend, forzando limpieza local.', error);
    } finally {
      // 🔥 MEJORA: Solo borramos lo relacionado a la sesión, no todo el localStorage
      localStorage.removeItem('supabase.auth.token'); // Ajusta este nombre según la llave real que use tu proyecto
      localStorage.removeItem('access_token');
      sessionStorage.clear(); 
      
      this.router.navigate(['/login']);
    }
  }
}