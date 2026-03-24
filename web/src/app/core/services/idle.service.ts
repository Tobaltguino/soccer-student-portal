import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

// 🚀 CAMBIO 1: Importamos AuthService
import { AuthService } from './auth.service';

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
    // 🚀 CAMBIO 2: Inyectamos AuthService
    private authService: AuthService,
    private ngZone: NgZone
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

      this.iniciarDetectorSuspension();
    });
  }

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
    // 🚀 CAMBIO 3: Usamos el método getUser() de AuthService 
    // Esto disparará la renovación automática del token si el PC despertó
    const { data, error } = await this.authService.getUser();

    if (error || !data.user) {
      this.ngZone.run(() => {
        this.cerrarSesionPorInactividad();
      });
    }
  }

  detenerMonitoreo() {
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
      this.idleSubscription = null;
    }
    if (this.suspensionInterval) {
      clearInterval(this.suspensionInterval);
    }
  }

  private async cerrarSesionPorInactividad() {
    this.detenerMonitoreo();
    this.onIdleTimeout.next(true);

    try {
      // 🚀 CAMBIO 4: Usamos el logout de nuestro AuthService
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }
}