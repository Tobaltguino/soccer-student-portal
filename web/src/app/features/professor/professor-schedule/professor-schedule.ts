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
import { TooltipModule } from 'primeng/tooltip';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-professor-schedule',
  standalone: true,
  imports: [
    CommonModule, 
    FullCalendarModule, 
    DialogModule, 
    ButtonModule,
    TagModule,
    TooltipModule
  ],
  templateUrl: './professor-schedule.html',
  styleUrls: ['./professor-schedule.css']
})
export class ProfessorScheduleComponent implements OnInit {
  
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'listWeek', // Para el profesor, ver la semana con bloques es mejor
    locale: esLocale,
    
    // --- CONFIGURACIÓN DE HORAS (24 HORAS COMPLETAS) ---
    slotMinTime: '06:00:00', // Mejor empezar a las 6 AM para ahorrar scroll
    slotMaxTime: '23:00:00', // Termina a las 11 PM
    scrollTime: '15:00:00',  // Se posiciona a las 3 PM al abrir (horario típico de canchas)
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
  grupos: any[] = [];

  constructor(
    private supabase: SupabaseService, // <-- Nombre corto
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarClasesCalendario();
  }

  async cargarClasesCalendario() {
    this.loading = true;
    try {
      // 1. Obtener usuario de Auth
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      // 2. Obtener perfil del profesor
      const { data: prof } = await this.supabase.getProfesorPorEmail(user.email);
      if (!prof) return;

      // 3. Obtener sus grupos
      const { data: gruposData } = await this.supabase.getGruposDeProfesor(prof.id);
      this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      
      const misGrupoIds = this.grupos.map(g => g.id);

      // 4. Obtener las clases si tiene grupos asignados
      if (misGrupoIds.length > 0) {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];

        // Lllamada limpia al servicio
        const { data: clases, error } = await this.supabase.getClasesPorGrupos(misGrupoIds, inicioMes);
        if (error) throw error;

        // Mapear eventos
        const eventos = (clases || []).map((clase: any) => {
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

  // Asigna un color fijo basado en el ID del grupo para diferenciarlos visualmente
  getColorPorGrupo(grupoId: number | string): string {
    const paleta = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const index = String(grupoId).charCodeAt(0) % paleta.length;
    return paleta[index];
  }
}