import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

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
  ultimaEvaluacion: any = null; // ✅ Ahora se llenará con datos de Supabase
  
  proximosEventos: any[] = []; 

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatosDashboard();
  }

  async cargarDatosDashboard() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (!user) return;

      const inicioAnio = `${new Date().getFullYear()}-01-01`;

      // 1. Cargar Clases y Asistencia
      const { data: clases } = await this.supabaseService.getClasesAlumno(user.id, inicioAnio);
      if (clases) {
        this.procesarClases(clases);
      }

      // 2. ✅ Cargar Evaluaciones Reales
      const { data: evaluaciones, error: errEval } = await this.supabaseService.getEvaluacionesAlumno(user.id);
      if (evaluaciones && evaluaciones.length > 0) {
        // Ordenamos por fecha de creación para tener la última registrada
        const ordenadas = evaluaciones.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.ultimaEvaluacion = ordenadas[0];
      }

    } catch (error) {
      console.error('Error dashboard:', error);
      this.supabaseStatus = 'offline';
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