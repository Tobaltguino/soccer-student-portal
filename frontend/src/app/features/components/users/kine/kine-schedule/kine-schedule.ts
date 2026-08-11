import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { SupabaseService } from '../../../../../core/services/supabase.service';

@Component({
  selector: 'app-kine-schedule',
  standalone: true,
  imports: [
    CommonModule, 
    FullCalendarModule, 
    DialogModule, 
    ButtonModule,
    TagModule,
    TooltipModule
  ],
  templateUrl: './kine-schedule.html',
  styleUrls: ['./kine-schedule.css']
})
export class KineScheduleComponent implements OnInit {
  
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'listWeek', 
    locale: esLocale,
    
    // --- CONFIGURACIÓN DE HORAS (24 HORAS COMPLETAS) ---
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
    private supabase: SupabaseService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarClasesCalendario();
  }

  async cargarClasesCalendario() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      const { data: kine } = await this.supabase.supabase
          .from('kinesiologos')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
      if (!kine) return;

      // ✅ Obtenemos los grupos asignados al Kinesiólogo
      const { data: gruposData } = await this.supabase.getGruposDeKine(kine.id);
      this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      
      const misGrupoIds = this.grupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];

        const { data: clases, error } = await this.supabase.getClasesPorGrupos(misGrupoIds, inicioMes);
        if (error) throw error;

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
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  handleEventClick(arg: any) {
    this.claseSeleccionada = arg.event.extendedProps;
    this.displayDetalle = true;
  }

  getColorPorGrupo(grupoId: number | string): string {
    const paleta = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const index = String(grupoId).charCodeAt(0) % paleta.length;
    return paleta[index];
  }
}