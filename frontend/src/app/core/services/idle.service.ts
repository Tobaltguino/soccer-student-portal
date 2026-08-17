import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject, firstValueFrom } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

// 🚀 Importamos tu nuevo servicio de autenticación conectado a NestJS
import { AuthService } from '../auth/services/auth.service';

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
  private margenSuspension = 10000; // 10 segundos (Si el reloj se retrasa más de 10s, asumimos suspensión)

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private authService: AuthService // 🔥 Inyectamos el AuthService real
  ) {}

  iniciarMonitoreo() {
    if (this.idleSubscription) return;

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
        this.ngZone.run(() => {
          this.cerrarSesionPorInactividad();
        });
      });

      // --- INICIAMOS EL RELOJ DETECTOR DE SUSPENSIÓN ---
      this.iniciarDetectorSuspension();
    });
  }

  // ==========================================
  // MAGIA ANTI-SUSPENSIÓN 
  // ==========================================
  private iniciarDetectorSuspension() {
    this.ultimoTick = Date.now();
    
    this.suspensionInterval = setInterval(() => {
      const ahora = Date.now();
      const diferencia = ahora - this.ultimoTick;

      // Si la diferencia es mayor a 10 segundos, el PC se durmió y acaba de despertar
      if (diferencia > this.margenSuspension) {
        this.verificarSesionAlDespertar();
      }

      this.ultimoTick = ahora;
    }, 2000); // Hacemos "tic" cada 2 segundos
  }

  private async verificarSesionAlDespertar() {
    try {
      // Le preguntamos a NestJS si nuestro JWT sigue siendo válido
      const res = await firstValueFrom(this.authService.me());
      
      if (!res || (!res.data && !res.email)) {
        this.ngZone.run(() => {
          this.cerrarSesionPorInactividad();
        });
      }
    } catch (error) {
      // Si NestJS responde con un 401 Unauthorized (token vencido), caerá aquí
      this.ngZone.run(() => {
        this.cerrarSesionPorInactividad();
      });
    }
  }
  // ==========================================

  detenerMonitoreo() {
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
      this.idleSubscription = null;
    }
    // Limpiamos el reloj si detenemos el monitoreo
    if (this.suspensionInterval) {
      clearInterval(this.suspensionInterval);
    }
  }

  private async cerrarSesionPorInactividad() {
    this.detenerMonitoreo();
    this.onIdleTimeout.next(true);

    try {
      // Llamamos a tu endpoint de logout en NestJS (si lo tienes)
      if (this.authService.logout) {
        await firstValueFrom(this.authService.logout());
      }
    } catch (error) {
      // Ignoramos los errores aquí, lo importante es limpiar todo en el frontend
    } finally {
      // Limpiamos localStorage, sessionStorage y redirigimos
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}