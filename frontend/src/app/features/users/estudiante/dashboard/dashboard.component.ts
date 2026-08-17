import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';

@Component({
  selector: 'app-estudiante-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class EstudianteDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private clasesService = inject(ClaseService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = true;
  apiStatus: 'online' | 'offline' | 'checking' = 'checking'; // Cambiado de supabaseStatus
  
  proximaClase: any = null;
  fechaFormateada: string = '';
  asistenciaAnual: number = 0;
  ultimaEvaluacion: any = null; 
  
  proximosEventos: any[] = []; 

  async ngOnInit() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosDashboard();
    }
  }

  async verificarConexion() {
    try {
      this.apiStatus = 'checking';
      const res = await firstValueFrom(this.authService.me());
      const user = res?.data ? res.data : res;

      if (!user) {
        this.apiStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.apiStatus = 'online';
      }
    } catch {
      this.apiStatus = 'offline';
    }
  }

  async cargarDatosDashboard() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Cargar Clases y Asistencia (Endpoint específico para el alumno)
      const resClases = await firstValueFrom(this.clasesService.obtenerMisClases());
      if (resClases && resClases.length > 0) {
        this.procesarClases(resClases);
      }

      // 2. Cargar Evaluaciones Reales
      // Usamos el método que ya tenías creado en tu servicio: listarMisResultados()
      const misResultados = await firstValueFrom(this.resultadoService.listarMisResultados());
      
      if (misResultados && misResultados.length > 0) {
        // Ordenamos por fecha para obtener el más reciente
        const ordenadas = misResultados.sort((a: any, b: any) => 
          new Date(b.created_at || b.fecha).getTime() - new Date(a.created_at || a.fecha).getTime()
        );
        this.ultimaEvaluacion = ordenadas[0];
      }

    } catch (error) {
      console.error('Error Estudiante Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  procesarClases(clases: any[]) {
    // Cálculo de asistencia
    const registradas = clases.filter(c => c.presente === true || c.presente === false);
    const asistidas = registradas.filter(c => c.presente === true).length;
    this.asistenciaAnual = registradas.length > 0 ? Math.round((asistidas / registradas.length) * 100) : 0;

    // Próxima clase
    const ahora = new Date();
    const futuras = clases
      .filter(c => c.presente === null && new Date(`${c.fecha}T${c.hora_inicio || c.hora}`) > ahora)
      .sort((a, b) => new Date(`${a.fecha}T${a.hora_inicio || a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora_inicio || b.hora}`).getTime());
    
    if (futuras.length > 0) {
      this.proximaClase = futuras[0];
      const fechaObj = new Date(`${this.proximaClase.fecha}T${this.proximaClase.hora_inicio || this.proximaClase.hora}`);
      this.fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        weekday: 'long', day: '2-digit', month: 'long'
      });
    }
  }

  async refrescar() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosDashboard();
    }
  }
}