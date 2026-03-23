import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// 🚀 CAMBIO 1: Importamos los 3 servicios específicos
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';
import { HealthService } from '../../../../core/services/health.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  // Datos dinámicos
  userEmail: string | undefined;
  totalEstudiantes: number = 0;
  clasesHoy: any[] = [];
  
  // Listas de datos
  actividadReciente: any[] = []; // Para la tarjeta de arriba (Evaluaciones)
  cumpleanosList: any[] = [];    // Para la lista de abajo (Cumpleaños)
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los 3 servicios
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
      
      // 🚀 CAMBIO 3: Usamos authService para validar la sesión
      const { data: { user }, error } = await this.authService.getUser();
      
      if (error || !user) {
        this.supabaseStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.userEmail = user.email;
        this.supabaseStatus = 'online';
      }
    } catch {
      this.supabaseStatus = 'offline';
    }
    this.cdr.detectChanges();
  }

  async cargarDatos() {
    this.loading = true;
    try {
      // 🚀 CAMBIO 4: Usamos academyService para traer alumnos
      const { data: estudiantes, error } = await this.academyService.getEstudiantes();
      
      if (estudiantes) {
        const estudiantesActivos = estudiantes.filter((est: any) => est.activo === true);
        this.totalEstudiantes = estudiantesActivos.length;
        this.cumpleanosList = this.filtrarProximosCumpleanos(estudiantesActivos);
      } else {
        this.totalEstudiantes = 0;
      }

      // 🚀 CAMBIO 5: Usamos academyService para traer clases
      const { data: clases } = await this.academyService.getClasesHoy();
      this.clasesHoy = clases || [];

      // 🚀 CAMBIO 6: Usamos healthService para traer evaluaciones médicas/físicas
      const { data: actividad } = await this.healthService.getActividadReciente();
      this.actividadReciente = actividad || [];

    } catch (error) {
      // Si falla la carga, simplemente dejamos los valores iniciales
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Lógica para filtrar cumpleaños próximos (0 a 7 días)
  filtrarProximosCumpleanos(estudiantes: any[]): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const listaProcesada = estudiantes
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
        const nuevaEdad = proximoCumple.getFullYear() - nacimiento.getFullYear();

        return {
          ...est,
          proximoCumple: proximoCumple,
          diasRestantes: diasRestantes,
          nuevaEdad: nuevaEdad
        };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return listaProcesada;
  }

  async refrescar() {
    await this.verificarConexion();
    await this.cargarDatos();
  } 
}