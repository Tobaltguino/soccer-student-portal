import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// 🚀 Servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../shared/services/academy.service';
import { HealthService } from '../../../../shared/services/health.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  userEmail: string | undefined;
  totalEstudiantes: number = 0;
  clasesHoy: any[] = [];
  
  // 🔥 NUEVOS KPIs DE SALUD GLOBAL
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  actividadReciente: any[] = []; 
  cumpleanosList: any[] = [];    
  
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    private authService: AuthService,
    private academyService: AcademyService,
    private healthService: HealthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.verificarConexion();
    await this.cargarDatos();
  }

  async verificarConexion() {
    try {
      this.supabaseStatus = 'checking';
      const { data: { user } } = await this.authService.getUser();
      if (!user) {
        this.supabaseStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.userEmail = user.email;
        this.supabaseStatus = 'online';
      }
    } catch {
      this.supabaseStatus = 'offline';
    }
  }

  async cargarDatos() {
    this.loading = true;
    try {
      // 1. Estudiantes
      const { data: estudiantes } = await this.academyService.getEstudiantes();
      if (estudiantes) {
        const activos = estudiantes.filter((est: any) => est.activo === true);
        this.totalEstudiantes = activos.length;
        this.cumpleanosList = this.filtrarProximosCumpleanos(activos);

        // 2. 🔥 Lógica de Salud Global para el Admin
        const alumnoIds = activos.map((a: any) => a.id);
        if (alumnoIds.length > 0) {
          const { data: historiales } = await this.healthService['supabase']
            .from('historial_clinico')
            .select('estudiante_id, estado')
            .in('estudiante_id', alumnoIds)
            .in('estado', ['EN_TRATAMIENTO', 'EN_OBSERVACION', 'EN_REINTEGRO_DEPORTIVO']);

          if (historiales) {
            const setTratamiento = new Set();
            const setObservacion = new Set();
            const setReintegro = new Set();

            historiales.forEach((h: any) => {
              if (h.estado === 'EN_TRATAMIENTO') setTratamiento.add(h.estudiante_id);
              if (h.estado === 'EN_OBSERVACION') setObservacion.add(h.estudiante_id);
              if (h.estado === 'EN_REINTEGRO_DEPORTIVO') setReintegro.add(h.estudiante_id);
            });

            this.pacientesEnTratamiento = setTratamiento.size;
            this.pacientesEnObservacion = setObservacion.size;
            this.pacientesEnReintegro = setReintegro.size;
          }
        }
      }

      // 3. Clases
      const { data: clases } = await this.academyService.getClasesHoy();
      this.clasesHoy = clases || [];

      // 4. Actividad (Evaluaciones)
      const { data: actividad } = await this.healthService.getActividadReciente();
      this.actividadReciente = actividad || [];

    } catch (error) {
      console.error('Error Admin Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  filtrarProximosCumpleanos(estudiantes: any[]): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return estudiantes
      .map(est => {
        if (!est.fecha_nacimiento) return null;
        const nacimiento = new Date(est.fecha_nacimiento + 'T00:00:00');
        const cumpleEsteAno = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        let proximoCumple = cumpleEsteAno < hoy ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate()) : cumpleEsteAno;
        const diasRestantes = Math.ceil((proximoCumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  async refrescar() {
    await this.verificarConexion();
    await this.cargarDatos();
  } 
}