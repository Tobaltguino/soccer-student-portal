import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado ConfirmDialogModule

import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase } from '../../../../core/domains/academico/clases/models/clase.interface';

// Nuevo servicio de asistencia
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';

@Component({
  selector: 'app-estudiante-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule,
    DialogModule, InputTextModule, DatePickerModule, SelectModule, TooltipModule, 
    ToastModule, ConfirmDialogModule // 🔥 Importado aquí
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado aquí
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss'] // Recuerda cambiar a .scss si usas sass
})
export class EstudianteClasesComponent implements OnInit {

  private claseService = inject(ClaseService);
  private asistenciaService = inject(AsistenciaService); 
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

    // Ejecutamos ambas peticiones en paralelo
    forkJoin({
      clases: this.claseService.obtenerMisClases(),
      asistencias: this.asistenciaService.obtenerMisAsistencias()
    }).subscribe({
      next: ({ clases, asistencias }) => {
        
        // Creamos un diccionario rápido de la asistencia del estudiante
        const asistenciasMap = new Map();
        asistencias.forEach(a => asistenciasMap.set(a.clase_id, a.presente));

        // Mapeamos las clases y les inyectamos su estado de asistencia
        const clasesMapeadas = clases.map(clase => ({
          ...clase,
          // Si el profe ya pasó lista para esta clase_id, le ponemos true/false. Si no, queda en null.
          presente: asistenciasMap.has(clase.id) ? asistenciasMap.get(clase.id) : null
        }));

        // Ordenamos las clases por fecha y hora (de más reciente a más antigua)
        this.clasesOriginales = clasesMapeadas.sort((a, b) => {
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