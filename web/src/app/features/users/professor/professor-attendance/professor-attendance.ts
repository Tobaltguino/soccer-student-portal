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

// 🚀 CAMBIO 1: Importamos los servicios de dominio (Auth y Academy)
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';

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
    // 🚀 CAMBIO 2: Inyectamos nuestros servicios especializados
    private authService: AuthService,
    private academyService: AcademyService,
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
      // 🚀 CAMBIO 3: Usamos AuthService
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      // 🚀 CAMBIO 4: Usamos la nueva función del AcademyService
      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);
      if (prof) {
        // 🚀 CAMBIO 5: Usamos AcademyService para los grupos
        const { data: gruposData } = await this.academyService.getGruposDeProfesor(prof.id);
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
      // 1. Obtener alumnos activos del grupo (🚀 CAMBIO 6: AcademyService)
      const { data: alumnos } = await this.academyService.getAlumnosPorGrupo(this.grupoSeleccionado);
      
      // 2. Definir rango de fechas válido
      const mesStr = ('0' + this.filtroMes).slice(-2);
      const primerDia = `${this.filtroAnio}-${mesStr}-01`;
      const ultimoDiaNum = new Date(this.filtroAnio, this.filtroMes, 0).getDate();
      const ultimoDia = `${this.filtroAnio}-${mesStr}-${ultimoDiaNum}`;

      // 3. Obtener asistencias del grupo en ese rango (🚀 CAMBIO 7: AcademyService)
      const { data: asistenciasMes, error } = await this.academyService.getAsistenciasPorGrupoYFechas(
        this.grupoSeleccionado, primerDia, ultimoDia
      );

      if (error) throw error;

      // 4. Procesar y calcular porcentajes
      this.estudiantesAsistencia = (alumnos || []).map((est: any) => {
        const registrosAlumno = asistenciasMes?.filter((a: any) => a.estudiante_id === est.id) || [];
        const totalClases = registrosAlumno.length;
        const totalPresentes = registrosAlumno.filter((a: any) => a.presente).length;
        const porcentaje = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0;

        return { 
          ...est, 
          porcentaje, 
          resumen: `${totalPresentes} / ${totalClases}` 
        };
      });

    } catch (error) {
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

      // 🚀 CAMBIO 8: Usamos la nueva función del AcademyService
      const { data, error } = await this.academyService.getHistorialAsistenciaAlumno(
        this.alumnoSeleccionado.id, primerDia, ultimoDia
      );

      if (error) throw error;
      this.historialAlumno = data || [];
    } catch (error) {
      console.error('Error cargando historial de asistencia', error);
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