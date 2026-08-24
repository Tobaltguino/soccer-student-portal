import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';
import listPlugin from '@fullcalendar/list/index.js';
import esLocale from '@fullcalendar/core/locales/es.js';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios de Dominio
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';

@Component({
  selector: 'app-estudiante-horario',
  standalone: true,
  imports: [
    CommonModule, 
    FullCalendarModule, 
    DialogModule, 
    ButtonModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.scss'] // 🔥 Cambiado a .scss (o deja .css si tu archivo es .css)
})
export class EstudianteHorarioComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private asistenciaService = inject(AsistenciaService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'listWeek',
    locale: esLocale,
    
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    scrollTime: '08:00:00',
    allDaySlot: false,
    slotDuration: '00:30:00', 
    
    slotLabelContent: (arg) => {
      const fechaFin = new Date(arg.date);
      fechaFin.setMinutes(fechaFin.getMinutes() + 30);
      
      const inicio = arg.text; 
      const fin = fechaFin.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      return { html: `<div class="slot-range" style="font-size: 0.7rem; font-weight: 600;">${inicio} - ${fin}</div>` };
    },

    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'listWeek,dayGridMonth'
    },
    
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      meridiem: false,
      hour12: false
    },
    
    events: [],
    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
    expandRows: true,
  };

  displayDetalle: boolean = false;
  claseSeleccionada: any = null;
  loading: boolean = true;

  ngOnInit() {
    this.cargarClasesCalendario();
  }

  cargarClasesCalendario() {
    this.loading = true;

    this.claseService.obtenerMisClases().subscribe({
      next: (clases) => {
        const eventos = clases.map((clase: any) => {
          const start = new Date(`${clase.fecha}T${clase.hora}`);
          const end = new Date(start.getTime() + 90 * 60000);

          return {
            title: `${clase.lugar || 'Cancha'}`,
            start: start.toISOString(),
            end: end.toISOString(),
            extendedProps: { ...clase },
            backgroundColor: this.getColorEvento(clase),
            borderColor: this.getColorEvento(clase)
          };
        });

        this.calendarOptions = { ...this.calendarOptions, events: eventos };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el horario.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  handleEventClick(arg: any) {
    this.claseSeleccionada = arg.event.extendedProps;
    this.displayDetalle = true;
    this.cdr.detectChanges(); 
  }

  getColorEvento(clase: any): string {
    if (clase.presente === true) return '#22c55e'; // Verde (Asistió)
    if (clase.presente === false) return '#ef4444'; // Rojo (Faltó)
    return '#3b82f6'; // Azul (Pendiente o Futuro)
  }

  puedeVerPlanificacion(clase: any): boolean {
    if (!clase || !clase.fecha || !clase.hora) return false;
    
    const tiempoClase = new Date(`${clase.fecha}T${clase.hora}`).getTime();
    const tiempoAhora = new Date().getTime();
    
    return tiempoClase <= tiempoAhora; 
  }
}