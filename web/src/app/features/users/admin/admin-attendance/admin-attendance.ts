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

import { AcademyService } from '../../../../core/services/academy.service';

@Component({
  selector: 'app-admin-attendance',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, SelectModule, 
    ButtonModule, DialogModule, TagModule, AvatarModule, 
    TooltipModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './admin-attendance.html',
  styleUrls: ['./admin-attendance.css']
})
export class AdminAttendanceComponent implements OnInit {
  
  grupos: any[] = [];
  grupoSeleccionado: any = null;
  estudiantesAsistencia: any[] = [];
  loading: boolean = false;

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
  anios = [2025, 2026, 2027];
  filtroMes: number = new Date().getMonth() + 1;
  filtroAnio: number = new Date().getFullYear();

  constructor(
    private academyService: AcademyService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarTodosLosGrupos();
  }

  async cargarTodosLosGrupos() {
    this.loading = true;
    const { data } = await this.academyService.getGrupos();
    this.grupos = data || [];
    this.loading = false;
    this.cdr.detectChanges();
  }

  async onFilterChange() {
    if (!this.grupoSeleccionado) {
      this.estudiantesAsistencia = [];
      return;
    }

    this.loading = true;
    const { inicio, fin } = this.getFechasRango();

    // 🚀 TODA la lógica pesada ahora vive en una sola línea del servicio
    const { data, error } = await this.academyService.getEstudiantesConEstadisticas(
      this.grupoSeleccionado, inicio, fin
    );

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al procesar estadísticas' });
    } else {
      this.estudiantesAsistencia = data || [];
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  async verHistorialIndividual(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.displayHistorial = true;
    this.loadingHistorial = true;
    
    const { inicio, fin } = this.getFechasRango();
    const { data } = await this.academyService.getHistorialAsistenciaAlumno(alumno.id, inicio, fin);
    
    this.historialAlumno = data || [];
    this.loadingHistorial = false;
    this.cdr.detectChanges();
  }

  // Helper privado para no repetir lógica de fechas
  private getFechasRango() {
    const mesStr = ('0' + this.filtroMes).slice(-2);
    const ultimoDiaNum = new Date(this.filtroAnio, this.filtroMes, 0).getDate();
    return {
      inicio: `${this.filtroAnio}-${mesStr}-01`,
      fin: `${this.filtroAnio}-${mesStr}-${ultimoDiaNum}`
    };
  }

  getSeverity(porcentaje: number): "success" | "warn" | "danger" | "secondary" {
    if (porcentaje >= 85) return 'success';
    if (porcentaje >= 70) return 'warn';
    if (porcentaje === 0) return 'secondary';
    return 'danger';
  }
}