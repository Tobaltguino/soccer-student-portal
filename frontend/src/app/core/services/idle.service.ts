import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service'; // Ajusta la ruta a tu auth.service real

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  
  private timeoutMilliseconds = 15 * 60 * 1000; // 15 minutos

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
      // 🔥 Validamos con Supabase si la sesión sigue activa de forma nativa
      const session = await this.authService.obtenerSesionActual();
      
      if (!session) {
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
      // 🔥 Llamada nativa a signOut sin firstValueFrom
      if (this.authService.signOut) {
        await this.authService.signOut();
      }
    } catch (error) {
      console.warn('Error al cerrar sesión en Supabase, forzando limpieza local.', error);
    } finally {
      // Supabase normalmente limpia sus propias keys, pero por seguridad limpiamos storage
      localStorage.clear(); 
      sessionStorage.clear(); 
      
      this.router.navigate(['/login']);
    }
  }
}