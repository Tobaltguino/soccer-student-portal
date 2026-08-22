import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 AGREGADO ConfirmationService
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 

// Servicios
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';

@Component({
  selector: 'app-administrador-asistencias',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, SelectModule, 
    ButtonModule, DialogModule, TagModule, AvatarModule, 
    TooltipModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService], // 🔥 AGREGADO ConfirmationService AQUÍ
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.scss'] 
})
export class AdministradorAsistenciasComponent implements OnInit {
  
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService); // 🔥 Inyectado para que el modal de confirmación funcione sin problemas
  private cdr = inject(ChangeDetectorRef);

  // Datos principales
  grupos: any[] = [];
  grupoSeleccionado: any = null;
  estudiantesAsistencia: any[] = [];
  
  // 🔥 Variable Maestra de Carga
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

  ngOnInit() {
    this.cargarTodosLosGrupos();
  }

  cargarTodosLosGrupos() {
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
      }
    });
  }

  onFilterChange() {
    // 🔥 Protección de doble recarga
    if (this.loading) return;

    if (!this.grupoSeleccionado) {
      this.estudiantesAsistencia = [];
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // 🔥 Forzar la visualización del overlay oscuro
    
    this.asistenciaService.obtenerReporteMensual(this.grupoSeleccionado, this.filtroMes, this.filtroAnio)
      .subscribe({
        next: (data) => {
          this.estudiantesAsistencia = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al calcular estadísticas' });
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  verHistorialIndividual(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.displayHistorial = true;
    this.cargarDetalleHistorial();
  }

  cargarDetalleHistorial() {
    // 🔥 Protección
    if (this.loadingHistorial) return;
    if (!this.alumnoSeleccionado) return;

    this.loadingHistorial = true;
    this.cdr.detectChanges(); // 🔥 Forzar spinner interno
    
    const estudianteId = this.alumnoSeleccionado.estudiante_id;

    this.asistenciaService.obtenerDetalleMensualEstudiante(estudianteId, this.filtroMes, this.filtroAnio)
      .subscribe({
        next: (data) => {
          this.historialAlumno = data || [];
          this.loadingHistorial = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial.' });
          this.loadingHistorial = false;
          this.cdr.detectChanges();
        }
      });
  }

  getSeverity(porcentaje: number): "success" | "warn" | "danger" | "secondary" {
    if (porcentaje >= 85) return 'success';
    if (porcentaje >= 70) return 'warn';
    if (porcentaje === 0) return 'secondary';
    return 'danger';
  }
}