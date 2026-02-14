import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-professor-attendance',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, SelectModule, 
    ButtonModule, DialogModule, TagModule, AvatarModule, 
    TooltipModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './professor-attendance.html',
  styleUrls: ['./professor-attendance.css']
})
export class ProfessorAttendanceComponent implements OnInit {
  
  // Datos principales
  grupos: any[] = [];
  grupoSeleccionado: any = null;
  estudiantesAsistencia: any[] = [];
  loading: boolean = false;

  // Modal Historial
  displayHistorial: boolean = false;
  alumnoSeleccionado: any = null;
  historialAlumno: any[] = [];
  loadingHistorial: boolean = false;

  // Filtros de Fecha
  meses = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];
  anios = [2025, 2026, 2027];
  filtroMes: number = new Date().getMonth() + 1;
  filtroAnio: number = new Date().getFullYear();

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarGrupos();
  }

  /**
   * Carga los grupos asignados al profesor logueado
   */
  async cargarGrupos() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      const { data: prof } = await this.supabase.getProfesorPorEmail(user.email);
      if (prof) {
        const { data: gruposData } = await this.supabase.getGruposDeProfesor(prof.id);
        this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      }
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Se ejecuta al cambiar de grupo o de mes/año en la vista principal
   */
  async onFilterChange() {
    if (!this.grupoSeleccionado) {
      this.estudiantesAsistencia = [];
      return;
    }

    this.loading = true;
    try {
      // 1. Obtener alumnos activos del grupo (Función de tu servicio)
      const { data: alumnos } = await this.supabase.getAlumnosPorGrupo(this.grupoSeleccionado);
      
      // 2. Definir rango de fechas válido
      const mesStr = ('0' + this.filtroMes).slice(-2);
      const primerDia = `${this.filtroAnio}-${mesStr}-01`;
      const ultimoDiaNum = new Date(this.filtroAnio, this.filtroMes, 0).getDate();
      const ultimoDia = `${this.filtroAnio}-${mesStr}-${ultimoDiaNum}`;

      // 3. Obtener asistencias del grupo en ese rango
      const { data: asistenciasMes, error } = await this.supabase.supabase
        .from('asistencias')
        .select('estudiante_id, presente, clases!inner(fecha)')
        .eq('clases.grupo_id', this.grupoSeleccionado)
        .gte('clases.fecha', primerDia)
        .lte('clases.fecha', ultimoDia);

      if (error) throw error;

      // 4. Procesar y calcular porcentajes
      this.estudiantesAsistencia = (alumnos || []).map(est => {
        const registrosAlumno = asistenciasMes?.filter(a => a.estudiante_id === est.id) || [];
        const totalClases = registrosAlumno.length;
        const totalPresentes = registrosAlumno.filter(a => a.presente).length;
        const porcentaje = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0;

        return { 
          ...est, 
          porcentaje, 
          resumen: `${totalPresentes} / ${totalClases}` 
        };
      });

    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al calcular estadísticas' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Abre el modal de historial detallado
   */
  async verHistorialIndividual(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.displayHistorial = true;
    await this.cargarDetalleHistorial();
  }

  /**
   * Carga el detalle de asistencias día por día para el modal
   */
  async cargarDetalleHistorial() {
    this.loadingHistorial = true;
    try {
      const mesStr = ('0' + this.filtroMes).slice(-2);
      const primerDia = `${this.filtroAnio}-${mesStr}-01`;
      const ultimoDiaNum = new Date(this.filtroAnio, this.filtroMes, 0).getDate();
      const ultimoDia = `${this.filtroAnio}-${mesStr}-${ultimoDiaNum}`;

      const { data, error } = await this.supabase.supabase
        .from('asistencias')
        .select('presente, clases!inner(fecha, hora, lugar)')
        .eq('estudiante_id', this.alumnoSeleccionado.id)
        .gte('clases.fecha', primerDia)
        .lte('clases.fecha', ultimoDia)
        .order('clases(fecha)', { ascending: false });

      if (error) throw error;
      this.historialAlumno = data || [];
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingHistorial = false;
      this.cdr.detectChanges();
    }
  }

  // Especificamos los tipos exactos que acepta p-tag de PrimeNG
  getSeverity(porcentaje: number): "success" | "warn" | "danger" | "secondary" {
    if (porcentaje >= 85) return 'success';
    if (porcentaje >= 70) return 'warn';
    if (porcentaje === 0) return 'secondary'; // Opcional para casos sin datos
    return 'danger';
  }
}