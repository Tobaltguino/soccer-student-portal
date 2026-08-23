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
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios de Dominio
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

@Component({
  selector: 'app-profesor-horario',
  standalone: true,
  imports: [
    CommonModule, 
    FullCalendarModule, 
    DialogModule, 
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.scss'] // 🔥 Cambiado a .scss
})
export class ProfesorHorarioComponent implements OnInit {
  
  private grupoService = inject(GrupoService);
  private claseService = inject(ClaseService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'listWeek',
    locale: esLocale,
    
    // --- CONFIGURACIÓN DE HORAS ---
    slotMinTime: '06:00:00',
    slotMaxTime: '23:00:00',
    scrollTime: '15:00:00',
    allDaySlot: false,
    slotDuration: '00:30:00', 
    
    // --- FORMATO DE RANGO (00:00 - 00:30) ---
    slotLabelContent: (arg) => {
      const fechaFin = new Date(arg.date);
      fechaFin.setMinutes(fechaFin.getMinutes() + 30);
      
      const inicio = arg.text; 
      const fin = fechaFin.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      // 🔥 Color text-secondary para que contraste en el modo oscuro
      return { html: `<div class="slot-range" style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">${inicio} - ${fin}</div>` };
    },

    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'listWeek,timeGridWeek,dayGridMonth'
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
  grupos: Grupo[] = [];

  ngOnInit() {
    this.cargarClasesCalendario();
  }

  cargarClasesCalendario() {
    this.loading = true;
    
    this.grupoService.obtenerMisGrupos().subscribe({
      next: (gruposData) => {
        this.grupos = gruposData || [];
        const misGrupoIds = this.grupos.map(g => g.id).filter(id => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.loading = false;
          this.calendarOptions = { ...this.calendarOptions, events: [] };
          this.cdr.detectChanges();
          return;
        }

        const hoy = new Date();
        const inicioMesStr = `${hoy.getFullYear()}-${('0' + (hoy.getMonth() + 1)).slice(-2)}-01`;

        // Generamos peticiones paralelas para todos los grupos asignados al profe
        const peticionesClases = misGrupoIds.map(id => 
          this.claseService.listarClases({ grupoId: id, desde: inicioMesStr, limite: 100 })
        );

        forkJoin(peticionesClases).subscribe({
          next: (respuestas) => {
            const todasLasClases = respuestas.flatMap(res => res.registros);

            const eventos = todasLasClases.map((clase: any) => {
              const grupoInfo = this.grupos.find(g => g.id === clase.grupo_id);
              const nombreGrupo = grupoInfo ? grupoInfo.nombre : 'Grupo Desconocido';
              
              const start = new Date(`${clase.fecha}T${clase.hora}`);
              const end = new Date(start.getTime() + 90 * 60000); 

              return {
                title: `${nombreGrupo} | ${clase.lugar}`,
                start: start.toISOString(),
                end: end.toISOString(),
                extendedProps: { ...clase, grupoNombre: nombreGrupo },
                backgroundColor: this.getColorPorGrupo(clase.grupo_id),
                borderColor: this.getColorPorGrupo(clase.grupo_id),
                textColor: '#ffffff'
              };
            });

            this.calendarOptions = { ...this.calendarOptions, events: eventos };
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.mostrarError('Error al cargar la agenda de clases');
          }
        });
      },
      error: () => {
        this.mostrarError('Error al cargar tus grupos asignados');
      }
    });
  }

  handleEventClick(arg: any) {
    this.claseSeleccionada = arg.event.extendedProps;
    this.displayDetalle = true;
    this.cdr.detectChanges();
  }

  getColorPorGrupo(grupoId: number | string): string {
    if (!grupoId) return '#3b82f6';
    const paleta = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const index = Number(grupoId) % paleta.length;
    return paleta[index];
  }

  private mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    this.loading = false;
    this.cdr.detectChanges();
  }
}