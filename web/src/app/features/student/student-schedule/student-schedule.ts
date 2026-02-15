import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [
    CommonModule, 
    FullCalendarModule, 
    DialogModule, 
    ButtonModule,
    TagModule
  ],
  templateUrl: './student-schedule.html',
  styleUrls: ['./student-schedule.css']
})
export class StudentScheduleComponent implements OnInit {
  
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

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarClasesCalendario();
  }

  async cargarClasesCalendario() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (user) {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        
        const { data, error } = await this.supabaseService.getClasesAlumno(user.id, inicioMes);

        if (error) throw error;

        const eventos = (data || []).map((clase: any) => {
            const start = new Date(`${clase.fecha}T${clase.hora}`);
            const end = new Date(start.getTime() + 90 * 60000); 

            return {
              title: `${clase.lugar}`,
              start: start.toISOString(),
              end: end.toISOString(),
              extendedProps: { ...clase },
              backgroundColor: this.getColorEvento(clase),
              borderColor: this.getColorEvento(clase),
              textColor: '#ffffff'
            };
        });

        this.calendarOptions = { ...this.calendarOptions, events: eventos };
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  handleEventClick(arg: any) {
    this.claseSeleccionada = arg.event.extendedProps;
    this.displayDetalle = true;
    this.cdr.detectChanges(); // ✅ IMPORTANTE: Fuerza a Angular a abrir el modal
  }

  getColorEvento(clase: any): string {
    if (clase.presente === true) return '#22c55e'; 
    if (clase.presente === false) return '#ef4444'; 
    return '#3b82f6'; 
  }

  // ✅ NUEVA FUNCIÓN DE CANDADO
  puedeVerPlanificacion(clase: any): boolean {
    if (!clase || !clase.fecha || !clase.hora) return false;
    
    const tiempoClase = new Date(`${clase.fecha}T${clase.hora}`).getTime();
    const tiempoAhora = new Date().getTime();
    
    return tiempoClase <= tiempoAhora; // Solo true si la hora actual ya pasó la hora de la clase
  }
}