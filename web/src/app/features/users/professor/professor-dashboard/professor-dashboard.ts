import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// 🚀 Servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../shared/services/academy.service';
import { HealthService } from '../../../../shared/services/health.service';

@Component({
  selector: 'app-professor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './professor-dashboard.html',
  styleUrls: ['./professor-dashboard.css']
})
export class ProfessorDashboardComponent implements OnInit {
  
  // Datos KPIs
  misGrupos: any[] = [];
  clasesHoy: any[] = [];
  proximaClase: any = null;
  ultimaEvaluacion: any = null;
  totalAlumnos: number = 0;

  // 🔥 NUEVOS KPIs DE SALUD (Para los grupos del profe)
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
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
    await this.cargarDatosProfe();
  }

  async verificarConexion() {
    try {
      this.supabaseStatus = 'checking';
      const { data: { user } } = await this.authService.getUser();
      if (!user) {
        this.supabaseStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.supabaseStatus = 'online';
      }
    } catch {
      this.supabaseStatus = 'offline';
    }
  }

  async cargarDatosProfe() {
    this.loading = true;
    // Reiniciar contadores
    this.pacientesEnTratamiento = 0;
    this.pacientesEnObservacion = 0;
    this.pacientesEnReintegro = 0;

    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);
      if (!prof) return;

      const { data: gruposData } = await this.academyService.getGruposDeProfesor(prof.id);
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoyStr = new Date().toISOString().split('T')[0];

        // 3. Clases
        const { data: clases } = await this.academyService.getClasesPorGrupos(misGrupoIds, hoyStr);
        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter((c: any) => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        // 4. Evaluaciones
        const { data: evals } = await this.healthService.getSesionesEvaluacionPorGrupos(misGrupoIds);
        if (evals && evals.length > 0) {
          this.ultimaEvaluacion = evals[0];
        }

        // 5. Alumnos y Salud
        const { data: alumnos } = await this.academyService.getTodosEstudiantesPorGrupos(misGrupoIds, true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);

          const alumnoIds = alumnos.map((a: any) => a.id);

          // 🔥 LÓGICA DE SALUD: Consultamos estados para los alumnos de ESTE profesor
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
    } catch (error) {
      console.error('Error cargando dashboard del profesor:', error);
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
}