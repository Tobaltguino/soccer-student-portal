import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';

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
      // 1. Cargar Estudiantes para el total y los cumpleaños
      const { data: estudiantes, error: errEst } = await this.supabaseService.supabase
        .from('estudiantes')
        .select('id, nombre, apellido, fecha_nacimiento, activo')
        .eq('activo', true);

      if (estudiantes) {
        this.totalEstudiantes = estudiantes.length;
        this.procesarCumpleanos(estudiantes);
      }

      // 2. Cargar ÚLTIMA Evaluación Nutricional (Solo FINALIZADAS)
      const { data: evaluaciones, error: errEval } = await this.supabaseService.supabase
        .from('evaluacion_nutri') 
        .select(`
          id, 
          fecha, 
          tipo_evaluacion_nutri(nombre) 
        `)
        .eq('estado', 'FINALIZADO')
        .order('fecha', { ascending: false })
        .limit(1);

      if (errEval) {
      }

      if (evaluaciones && evaluaciones.length > 0) {
        this.ultimaEvaluacionGlobal = evaluaciones[0];
      } else {
        this.ultimaEvaluacionGlobal = null;
      }

    } catch (error) {
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
        const [year, month, day] = e.fecha_nacimiento.split('-');
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
      .filter(e => e.diasFaltantes <= 7) // <-- Filtro de 7 días
      .sort((a, b) => a.diasFaltantes - b.diasFaltantes)
      .slice(0, 10);

    this.proximosCumpleanos = cumplesCalculados;
  }

  refrescar() {
    this.cargarDatosDashboard();
  }
}