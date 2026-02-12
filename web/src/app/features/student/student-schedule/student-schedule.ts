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
    initialView: 'timeGridWeek',
    locale: esLocale,
    
    // --- CONFIGURACIÓN DE HORAS (24 HORAS COMPLETAS) ---
    slotMinTime: '00:00:00', // Comienza a las 12 AM
    slotMaxTime: '24:00:00', // Termina a las 12 AM del día siguiente
    scrollTime: '08:00:00',  // Se posiciona automáticamente a las 8 AM al abrir
    allDaySlot: false,
    slotDuration: '00:30:00', 
    
    // --- FORMATO DE RANGO (00:00 - 00:30) ---
    slotLabelContent: (arg) => {
      // Calculamos el fin del bloque sumando 30 minutos a la hora de la celda
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
      right: 'timeGridWeek,dayGridMonth,listWeek'
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
            // Asumimos 90 minutos de duración para la visualización en el calendario
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
  }

  getColorEvento(clase: any): string {
    if (clase.presente === true) return '#22c55e'; // Verde para asistida
    if (clase.presente === false) return '#ef4444'; // Rojo para falta
    return '#3b82f6'; // Azul para pendiente
  }
}