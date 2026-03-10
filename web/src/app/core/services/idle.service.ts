import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer, Subject } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

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
    private supabaseService: SupabaseService,
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
        console.warn(`💻 El PC se suspendió por ${Math.round(diferencia/1000)} segundos. Verificando sesión...`);
        this.verificarSesionAlDespertar();
      }

      this.ultimoTick = ahora;
    }, 2000); // Hacemos "tic" cada 2 segundos
  }

  private async verificarSesionAlDespertar() {
    // Al pedir getSession(), Supabase intentará renovar el token si está vencido
    const { data, error } = await this.supabaseService.supabase.auth.getSession();

    if (error || !data.session) {
      console.error('La sesión murió mientras el PC estaba suspendido.');
      this.ngZone.run(() => {
        // Aquí podrías mostrar un alert o Toast indicando que la sesión expiró
        this.cerrarSesionPorInactividad();
      });
    } else {
      console.log('La sesión sobrevivió a la suspensión. Todo OK.');
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
      await this.supabaseService.supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login']);
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }
}