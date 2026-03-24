import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// 🚀 CAMBIO 1: Importamos los servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { HealthService } from '../../../../core/services/health.service';
import { AcademyService } from '../../../../core/services/academy.service';

@Component({
  selector: 'app-kine-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kine-dashboard.html',
  styleUrls: ['./kine-dashboard.css']
})
export class KineDashboardComponent implements OnInit {
  
  // Datos KPIs
  misGrupos: any[] = [];
  clasesHoy: any[] = [];
  proximaClase: any = null;
  totalAlumnos: number = 0;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios especializados
    private authService: AuthService,
    private healthService: HealthService,
    private academyService: AcademyService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.verificarConexion();
    await this.cargarDatosKine();
  }

  async verificarConexion() {
    try {
      this.supabaseStatus = 'checking';
      // 🚀 CAMBIO 3: Usamos authService
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

  async cargarDatosKine() {
    this.loading = true;
    try {
      // 🚀 CAMBIO 4: Usamos authService
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      // 1. Obtener ID del Kinesiólogo (Usando la función que creamos en el paso anterior)
      const { data: kine } = await this.healthService.getKineByEmail(user.email);
      if (!kine) return;

      // 2. Obtener sus Grupos Asignados
      const { data: gruposData } = await this.healthService.getGruposDeKine(kine.id);
      
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoyStr = new Date().toISOString().split('T')[0];

        // 3. 🚀 CAMBIO 5: Clases usando academyService
        const { data: clases } = await this.academyService.getClasesPorGrupos(misGrupoIds, hoyStr);

        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter((c: any) => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        // 4. 🚀 CAMBIO 6: Alumnos y Cumpleaños usando academyService
        const { data: alumnos } = await this.academyService.getTodosEstudiantesPorGrupos(misGrupoIds, true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);
        }
      }

    } catch (error) {
      console.error('Error al cargar datos del dashboard kine', error);
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