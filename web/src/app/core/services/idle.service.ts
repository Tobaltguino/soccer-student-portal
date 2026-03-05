import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { SupabaseService } from './supabase.service'; // Asegúrate de que la ruta sea la correcta

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  
  private timeoutMilliseconds = 15 * 60 * 1000; // 15 minutos 
  
  private idleSubscription: Subscription | null = null;
  public onIdleTimeout = new Subject<boolean>();

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private ngZone: NgZone
  ) {}

  iniciarMonitoreo() {
    if (this.idleSubscription) {
      return; // Ya está corriendo
    }

    this.ngZone.runOutsideAngular(() => {
      
      const activityEvents$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'scroll')
      );

      this.idleSubscription = activityEvents$.pipe(
        startWith(null), 
        // Cada vez que detecta un evento, reinicia el timer con los 10 segundos
        switchMap(() => timer(this.timeoutMilliseconds))
      ).subscribe(() => {
        
        // Cuando llega a cero, ejecuta el logout
        this.ngZone.run(() => {
          this.cerrarSesionPorInactividad();
        });
        
      });
    });
  }

  detenerMonitoreo() {
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
      this.idleSubscription = null;
    }
  }

  private async cerrarSesionPorInactividad() {
    this.detenerMonitoreo();
    this.onIdleTimeout.next(true); // Avisamos a app.component para que muestre el Toast

    try {
      await this.supabaseService.supabase.auth.signOut();
      
      localStorage.clear();
      sessionStorage.clear();
      
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.router.navigate(['/login']);
    }
  }
}