import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, ConfirmationService } from 'primeng/api';

// Servicios
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GrupoService } from '../grupos/services/grupo.service';
import { AsistenciaService } from './services/asistencias.service';
import { ClaseService } from '../clases/services/clases.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    ButtonModule,
    DialogModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    ChartModule,
    ProgressBarModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.scss']
})
export class AsistenciasComponent implements OnInit {
  private authService = inject(AuthService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService);
  private claseService = inject(ClaseService);
  private excelService = inject(ExcelExportService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Control de Roles y Vistas
  rolActual: string = '';
  esAdmin: boolean = false;
  esProfesor: boolean = false;
  esKinesiologo: boolean = false;
  esEstudiante: boolean = false;
  esVistaGrupal: boolean = false;

  // Estado de carga general
  loading: boolean = false;

  // ==========================================
  // ESTADO: VISTA GRUPAL
  // ==========================================
  grupos: any[] = [];
  grupoSeleccionado: any = null;
  estudiantesAsistencia: any[] = [];

  displayHistorial: boolean = false;
  alumnoSeleccionado: any = null;
  historialAlumno: any[] = [];
  loadingHistorial: boolean = false;

  meses = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];
  anios = [2024, 2025, 2026, 2027];
  filtroMes: number = new Date().getMonth() + 1;
  filtroAnio: number = new Date().getFullYear();

  // ==========================================
  // ESTADO: VISTA INDIVIDUAL
  // ==========================================
  hasData: boolean = false;
  hasYearlyData: boolean = false;
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number | null = null;

  years = [
    { label: '2024', value: 2024 }, { label: '2025', value: 2025 },
    { label: '2026', value: 2026 }, { label: '2027', value: 2027 }
  ];

  monthsEstudiante = [
    { label: 'Todo el año', value: null },
    { label: 'Enero', value: 0 }, { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 }, { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 }, { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 }, { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 }, { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 }, { label: 'Diciembre', value: 11 }
  ];

  pieData: any;
  pieOptions: any;
  barData: any;
  barOptions: any;
  totalAsistidas: number = 0;
  porcentajeAsistencia: number = 0;
  clasesCacheadas: any[] = [];

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        // Asumiendo que tu authService ya usa Supabase con async/await
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esAdmin = this.rolActual === 'administrador';
      this.esProfesor = this.rolActual === 'profesor';
      this.esKinesiologo = this.rolActual === 'kinesiologo';
      this.esEstudiante = this.rolActual === 'estudiante';

      this.esVistaGrupal = this.esAdmin || this.esProfesor || this.esKinesiologo;

      if (this.esEstudiante) {
        this.initChartOptions();
        await this.cargarDatosEstadisticosEstudiante();
      } else if (this.esVistaGrupal) {
        await this.cargarGrupos();
      } else {
        this.loading = false;
      }
    } catch (error) {
      console.error('Error al verificar rol en asistencias:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // MÉTODOS: VISTA GRUPAL 
  // =========================================================
  async cargarGrupos() {
    this.loading = true;
    try {
      this.grupos = await this.grupoService.listarGrupos() || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async onFilterChange() {
    if (this.loading) return;
    if (!this.grupoSeleccionado) {
      this.estudiantesAsistencia = [];
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.estudiantesAsistencia = await this.asistenciaService.obtenerReporteMensual(
        this.grupoSeleccionado, 
        this.filtroMes, 
        this.filtroAnio
      ) || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al calcular estadísticas' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async descargarExcel() {
    if (!this.esAdmin) return;
    if (!this.grupoSeleccionado || this.estudiantesAsistencia.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'Selecciona un grupo con registros para exportar.' });
      return;
    }

    // Asegúrate de que el ExcelExportService ahora use una librería de frontend (como 'xlsx') 
    // en lugar de esperar el Buffer desde NestJS.
    try {
      await this.excelService.exportarAsistenciasMensuales(this.grupoSeleccionado, this.filtroMes, this.filtroAnio);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el Excel' });
    }
  }

  verHistorialIndividual(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.displayHistorial = true;
    this.cargarDetalleHistorial();
  }

  async cargarDetalleHistorial() {
    if (this.loadingHistorial || !this.alumnoSeleccionado) return;

    this.loadingHistorial = true;
    this.cdr.detectChanges();

    try {
      const estudianteId = this.alumnoSeleccionado.estudiante_id;
      this.historialAlumno = await this.asistenciaService.obtenerDetalleMensualEstudiante(
        estudianteId, 
        this.filtroMes, 
        this.filtroAnio
      ) || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial.' });
    } finally {
      this.loadingHistorial = false;
      this.cdr.detectChanges();
    }
  }

  getSeverity(porcentaje: number): "success" | "warn" | "danger" | "secondary" {
    if (porcentaje >= 85) return 'success';
    if (porcentaje >= 70) return 'warn';
    if (porcentaje === 0) return 'secondary';
    return 'danger';
  }

  // =========================================================
  // MÉTODOS: VISTA ESTUDIANTE 
  // =========================================================
  async cargarDatosEstadisticosEstudiante() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.clasesCacheadas = await this.claseService.obtenerMisClases() || [];
      this.procesarEstadisticasEstudiante();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las estadísticas.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  procesarEstadisticasEstudiante() {
    const getAnio = (fecha: string) => parseInt(fecha.substring(0, 4), 10);
    const getMes = (fecha: string) => parseInt(fecha.substring(5, 7), 10) - 1;

    let filtradas = this.clasesCacheadas.filter(c =>
      c.fecha &&
      getAnio(c.fecha as string) === this.selectedYear &&
      (c.presente === true || c.presente === false)
    );

    if (this.selectedMonth !== null) {
      filtradas = filtradas.filter(c => getMes(c.fecha as string) === this.selectedMonth);
    }

    this.hasData = filtradas.length > 0;
    const asistidas = filtradas.filter(c => c.presente === true).length;
    const faltas = filtradas.filter(c => c.presente === false).length;

    this.totalAsistidas = asistidas;
    const total = filtradas.length;
    this.porcentajeAsistencia = total > 0 ? Math.round((asistidas / total) * 100) : 0;

    if (this.hasData) {
      this.pieData = {
        labels: ['Asistidas', 'Faltas'],
        datasets: [{
          data: [asistidas, faltas],
          backgroundColor: ['#c6ff3d', '#ff5c5c'],
          borderWidth: 0
        }]
      };
    }

    const countsPorMes = new Array(12).fill(0);
    let totalAnual = 0;

    this.clasesCacheadas.forEach(clase => {
      if (clase.fecha && clase.presente === true && getAnio(clase.fecha as string) === this.selectedYear) {
        const mes = getMes(clase.fecha as string);
        countsPorMes[mes]++;
        totalAnual++;
      }
    });

    this.hasYearlyData = totalAnual > 0;
    this.barData = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [{
        label: 'Asistencias',
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        data: countsPorMes,
        barPercentage: 0.5
      }]
    };

    this.cdr.detectChanges();
  }

  initChartOptions() {
    const textColor = '#eaf2f0';
    const textMuted = '#7c8b88';
    const gridColor = 'rgba(234, 242, 240, 0.08)';

    this.pieOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { usePointStyle: true, color: textColor, padding: 15, font: { family: 'Oswald', size: 13 } }
        }
      },
      cutout: '70%'
    };

    this.barOptions = {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textMuted, font: { family: 'Oswald', size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, suggestedMax: 5, ticks: { color: textMuted, stepSize: 1, font: { family: 'Inter', size: 11 } }, grid: { color: gridColor } }
      }
    };
  }
}