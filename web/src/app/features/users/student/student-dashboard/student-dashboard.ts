import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// 🚀 CAMBIO 1: Importamos los servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../shared/services/academy.service';
import { HealthService } from '../../../../shared/services/health.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboardComponent implements OnInit {
  loading: boolean = true;
  supabaseStatus: string = 'online';
  
  proximaClase: any = null;
  fechaFormateada: string = '';
  asistenciaAnual: number = 0;
  ultimaEvaluacion: any = null; 
  
  proximosEventos: any[] = []; 

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios especializados
    private authService: AuthService,
    private academyService: AcademyService,
    private healthService: HealthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatosDashboard();
  }

  async cargarDatosDashboard() {
    this.loading = true;
    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user) return;

      const inicioAnio = `${new Date().getFullYear()}-01-01`;

      const [resClases, resEvals] = await Promise.all([
        this.academyService.getClasesAlumno(user.id as string, inicioAnio),
        this.healthService.getEvaluacionesAlumno(user.id as string)
      ]);

      // 1. Procesar Clases y Asistencia
      if (resClases.data) {
        this.procesarClases(resClases.data);
      }

      // 2. Procesar Última Evaluación
      if (resEvals.data && resEvals.data.length > 0) {
        
        // 🔥 FILTRO: Solo tomamos las que vengan con estado finalizado
        const evaluacionesCompletadas = resEvals.data.filter((e: any) => {
           const estado = e.estado_sesion || '';
           return estado.toUpperCase() === 'FINALIZADA' || estado.toUpperCase() === 'FINALIZADO';
        });

        if (evaluacionesCompletadas.length > 0) {
          this.ultimaEvaluacion = evaluacionesCompletadas[0];
        } else {
          this.ultimaEvaluacion = null;
        }
      }

    } catch (error) {
      this.supabaseStatus = 'offline';
      console.error('Error cargando dashboard del alumno:', error);
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
      .filter(c => c.presente === null && new Date(`${c.fecha}T${c.hora}`) > ahora)
      .sort((a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime());
    
    if (futuras.length > 0) {
      this.proximaClase = futuras[0];
      const fechaObj = new Date(`${this.proximaClase.fecha}T${this.proximaClase.hora}`);
      this.fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        weekday: 'long', day: '2-digit', month: 'long'
      });
    }
  }

  refrescar() {
    this.cargarDatosDashboard();
  }
}