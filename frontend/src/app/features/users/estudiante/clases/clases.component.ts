import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase } from '../../../../core/domains/academico/clases/models/clase.interface';

@Component({
  selector: 'app-estudiante-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule,
    DialogModule, InputTextModule, DatePickerModule, SelectModule, TooltipModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.css']
})
export class EstudianteClasesComponent implements OnInit {

  private claseService = inject(ClaseService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  clases: Clase[] = [];
  clasesOriginales: Clase[] = [];
  loading: boolean = true;

  filtroFecha: Date | null = null;
  filtroLugar: string = '';
  filtroAsistencia: any = null;

  opcionesAsistencia = [
    { label: 'Presente', value: true },
    { label: 'Ausente', value: false },
    { label: 'Pendiente', value: 'null' }
  ];

  displayPlan: boolean = false;
  selectedClase: Clase | null = null;

  ngOnInit() {
    this.cargarClases();
  }

  cargarClases() {
    this.loading = true;

    this.claseService.obtenerMisClases().subscribe({
      next: (data) => {
        this.clasesOriginales = data.sort((a, b) => {
          const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
          const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
          return tiempoB - tiempoA;
        });

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus clases' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true;
      let cumpleLugar = true;
      let cumpleAsistencia = true;

      // ✅ Filtrado de fecha ajustado para manejar correctamente Date objects vs Strings
      if (this.filtroFecha) {
        const fechaBusqueda = this.formatearFecha(this.filtroFecha);
        const fechaClase = clase.fecha ? clase.fecha.substring(0, 10) : '';
        cumpleFecha = fechaClase === fechaBusqueda;
      }

      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
        const lugarClase = (clase.lugar || '').toLowerCase();
        const busqueda = this.filtroLugar.toLowerCase();
        cumpleLugar = lugarClase.includes(busqueda);
      }

      if (this.filtroAsistencia !== null) {
        if (this.filtroAsistencia === 'null') {
          cumpleAsistencia = clase.presente === null || clase.presente === undefined;
        } else {
          cumpleAsistencia = clase.presente === this.filtroAsistencia;
        }
      }

      return cumpleFecha && cumpleLugar && cumpleAsistencia;
    });

    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.filtroAsistencia = null;
    this.aplicarFiltros();
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  getAsistenciaLabel(presente: boolean | null | undefined): string {
    if (presente === true) return 'Presente';
    if (presente === false) return 'Ausente';
    return 'Pendiente';
  }

  getAsistenciaSeverity(presente: boolean | null | undefined): 'success' | 'danger' | 'secondary' {
    if (presente === true) return 'success';
    if (presente === false) return 'danger';
    return 'secondary';
  }

  puedeVerPlanificacion(clase: Clase): boolean {
    if (!clase.fecha || !clase.hora) return false;

    const tiempoClase = new Date(`${clase.fecha}T${clase.hora}`).getTime();
    const tiempoAhora = new Date().getTime();

    return tiempoClase <= tiempoAhora;
  }
}