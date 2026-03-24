import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// 🚀 CAMBIO 1: Importamos nuestros servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';
import { HealthService } from '../../../../core/services/health.service';

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

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios específicos
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
      // 🚀 CAMBIO 3: Usamos AuthService
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
    try {
      // 🚀 CAMBIO 4: Usamos AuthService
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      // 1. Obtener Perfil e ID del Profesor (Usando AcademyService)
      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);
      if (!prof) return;

      // 2. Obtener sus Grupos
      const { data: gruposData } = await this.academyService.getGruposDeProfesor(prof.id);
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoyStr = new Date().toISOString().split('T')[0];

        // 3. Clases de Hoy y Próxima Clase (¡Reutilizamos la función que hicimos para el Kine!)
        const { data: clases } = await this.academyService.getClasesPorGruposYFecha(misGrupoIds, hoyStr);

        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter((c: any) => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        // 4. Última Evaluación Subida (¡Reutilizamos función del HealthService!)
        const { data: evals } = await this.healthService.getSesionesEvaluacionPorGrupos(misGrupoIds);
        if (evals && evals.length > 0) {
          this.ultimaEvaluacion = evals[0];
        }

        // 5. Alumnos y Cumpleaños (¡Reutilizamos función del AcademyService!)
        const { data: alumnos } = await this.academyService.getEstudiantesActivosPorGrupos(misGrupoIds);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);
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
        let proximoCumple = cumpleEsteAno;
        
        if (proximoCumple < hoy) {
            proximoCumple = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate());
        }
        
        const diffTime = proximoCumple.getTime() - hoy.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}