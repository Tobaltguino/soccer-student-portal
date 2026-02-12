import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

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
    private supabaseService: SupabaseService,
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
      const { data: { user }, error } = await this.supabaseService.getUser();
      
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
      // 1. Estudiantes: Traemos la lista completa
      // CORRECCIÓN: Usamos 'data' directamente y contamos el largo del array (.length)
      const { data: estudiantes, error } = await this.supabaseService.getEstudiantes();
      
      if (estudiantes) {
        // ✅ AQUÍ ESTABA EL ERROR: Usamos .length porque 'count' venía vacío del servicio
        this.totalEstudiantes = estudiantes.length;
        
        // Procesamos los cumpleaños con la lista obtenida
        this.cumpleanosList = this.filtrarProximosCumpleanos(estudiantes);
      } else {
        this.totalEstudiantes = 0;
      }

      // 2. Clases de Hoy
      const { data: clases } = await this.supabaseService.getClasesHoy();
      this.clasesHoy = clases || [];

      // 3. Evaluaciones (Para la tarjeta morada)
      const { data: actividad } = await this.supabaseService.getActividadReciente();
      this.actividadReciente = actividad || [];

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
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

        // Asegurar formato fecha (YYYY-MM-DD T00:00:00) para evitar desfases
        const nacimiento = new Date(est.fecha_nacimiento + 'T00:00:00');
        
        const cumpleEsteAno = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        
        let proximoCumple = cumpleEsteAno;
        // Si ya pasó el cumpleaños este año, calculamos el del próximo
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
      // Filtramos solo los que son hoy o en los próximos 7 días
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      // Ordenamos del más cercano al más lejano
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return listaProcesada;
  }

  async refrescar() {
    await this.verificarConexion();
    await this.cargarDatos();
  }
}