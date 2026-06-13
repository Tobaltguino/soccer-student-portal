import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { AsistenciaService } from '../../../../core/services/modulos/academico/asistencia.service';
import { EvaluacionFisicaService } from '../../../../core/services/modulos/academico/evaluacion-fisica.service';

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
    private authService: AuthService,
    private asistenciaService: AsistenciaService,
    private evaluacionFisicaService: EvaluacionFisicaService,
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
        this.asistenciaService.getClasesAlumno(user.id, inicioAnio),
        this.evaluacionFisicaService.getEvaluacionesAlumno(user.id)
      ]);

      // 1. Procesar Clases y Asistencia
      if (resClases.data) {
        this.procesarClases(resClases.data);
      }

      // 2. Procesar Última Evaluación Física
      if (resEvals.data && resEvals.data.length > 0) {
        
        // FILTRO: Solo tomamos las que vengan con estado finalizado
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