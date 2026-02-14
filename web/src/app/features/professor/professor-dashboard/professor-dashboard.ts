import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

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
    private supabase: SupabaseService,
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
      const { data: { user } } = await this.supabase.getUser();
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
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      // 1. Obtener Perfil e ID del Profesor
      const { data: prof } = await this.supabase.getProfesorPorEmail(user.email);
      if (!prof) return;

      // 2. Obtener sus Grupos
      const { data: gruposData } = await this.supabase.getGruposDeProfesor(prof.id);
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        // 3. Clases de Hoy y Próxima Clase
        const hoyStr = new Date().toISOString().split('T')[0];
        const { data: clases } = await this.supabase.supabase
          .from('clases')
          .select('*, grupos(nombre)')
          .in('grupo_id', misGrupoIds)
          .gte('fecha', hoyStr)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });

        const todasClases = clases || [];
        // Clases que ocurren estrictamente hoy
        this.clasesHoy = todasClases.filter(c => c.fecha === hoyStr);
        // La primera de la lista (ordenada) es la próxima
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        // 4. Última Evaluación Subida
        const { data: evals } = await this.supabase.getSesionesEvaluacionPorGrupos(misGrupoIds);
        if (evals && evals.length > 0) {
          // Ya vienen ordenadas por fecha desc en el servicio
          this.ultimaEvaluacion = evals[0];
        }

        // 5. Alumnos y Cumpleaños (Solo de sus grupos)
        const { data: alumnos } = await this.supabase.supabase
          .from('estudiantes')
          .select('*, grupos(nombre)')
          .in('grupo_id', misGrupoIds)
          .eq('activo', true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);
        }
      }

    } catch (error) {
      console.error('Error dashboard:', error);
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
        if (proximoCumple < hoy) proximoCumple = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate());
        
        const diffTime = proximoCumple.getTime() - hoy.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}