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
  actividadReciente: any[] = [];
  
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
      // 1. Total Estudiantes
      const { count } = await this.supabaseService.getTotalEstudiantes();
      this.totalEstudiantes = count || 0;

      // 2. Clases de Hoy
      const { data: clases } = await this.supabaseService.getClasesHoy();
      this.clasesHoy = clases || [];

      // 3. Actividad Reciente (Evaluaciones)
      const { data: actividad } = await this.supabaseService.getActividadReciente();
      this.actividadReciente = actividad || [];

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Función para refrescar manualmente
  async refrescar() {
    await this.verificarConexion();
    await this.cargarDatos();
  }
}