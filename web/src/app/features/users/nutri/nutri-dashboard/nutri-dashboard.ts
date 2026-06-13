import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// 🚀 CAMBIO 1: Importamos los servicios de dominio
import { AcademyService } from '../../../../shared/services/academy.service';
import { HealthService } from '../../../../shared/services/health.service';

@Component({
  selector: 'app-nutri-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nutri-dashboard.html',
  styleUrl: './nutri-dashboard.css',
})
export class NutriDashboardComponent implements OnInit {
  loading: boolean = true;
  supabaseStatus: string = 'online';
  
  totalEstudiantes: number = 0;
  ultimaEvaluacionGlobal: any = null;
  proximosCumpleanos: any[] = [];
  
  // 👉 Aquí declaramos la variable para poder iterarla en el HTML con un *ngFor o @for
  estudiantes: any[] = [];

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios específicos en lugar del genérico
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
      // 🚀 CAMBIO 3: Ejecutamos ambas promesas en paralelo para mayor velocidad
      const [resEstudiantes, resEvaluacion] = await Promise.all([
        this.academyService.getEstudiantesActivos(),
        this.healthService.getUltimaEvaluacionNutriFinalizada()
      ]);

      const estudiantes = resEstudiantes.data;
      
      if (estudiantes) {
        // 👉 Guardamos la lista en la variable global de la clase
        this.estudiantes = estudiantes; 
        
        this.totalEstudiantes = estudiantes.length;
        this.procesarCumpleanos(estudiantes);
      }

      // 🚀 CAMBIO 4: Asignamos la evaluación directamente gracias a maybeSingle()
      if (resEvaluacion.data) {
        this.ultimaEvaluacionGlobal = resEvaluacion.data;
      } else {
        this.ultimaEvaluacionGlobal = null;
      }

      this.supabaseStatus = 'online';

    } catch (error) {
      console.error('Error al cargar los datos del dashboard:', error);
      this.supabaseStatus = 'offline';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  procesarCumpleanos(estudiantes: any[]) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cumplesCalculados = estudiantes
      .filter(e => e.fecha_nacimiento)
      .map(e => {
        // Limpiamos la fecha por si Supabase la envía con Timezone (ej: "2000-10-15T00:00:00Z")
        const fechaLimpia = e.fecha_nacimiento.split('T')[0];
        const [year, month, day] = fechaLimpia.split('-');
        
        const fechaNac = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        let proximoCumple = new Date(hoy.getFullYear(), fechaNac.getMonth(), fechaNac.getDate());
        
        if (proximoCumple < hoy) {
          proximoCumple.setFullYear(hoy.getFullYear() + 1);
        }
        
        const diasFaltantes = Math.ceil((proximoCumple.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
        const edadACumplir = proximoCumple.getFullYear() - fechaNac.getFullYear();

        return {
          ...e,
          proximoCumple,
          diasFaltantes,
          edadACumplir
        };
      })
      .filter(e => e.diasFaltantes <= 7) // <-- Filtro de 7 días (ajusta si quieres ver más a futuro)
      .sort((a, b) => a.diasFaltantes - b.diasFaltantes)
      .slice(0, 10);

    this.proximosCumpleanos = cumplesCalculados;
  }

  refrescar() {
    this.cargarDatosDashboard();
  }
}