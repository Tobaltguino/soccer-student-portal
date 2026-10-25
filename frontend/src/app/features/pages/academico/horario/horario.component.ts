import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG & FullCalendar
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// Servicios (Rutas corregidas según tu nuevo árbol de directorios)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ClaseService } from '../clases/services/clases.service';
import { GrupoService } from '../grupos/services/grupo.service';

@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [
    CommonModule, FullCalendarModule, ButtonModule, DialogModule,
    TagModule, ToastModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.scss']
})
export class HorarioComponent implements OnInit {

  private authService = inject(AuthService);
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esStaff: boolean = false; // Profesor o Kinesiólogo
  esEstudiante: boolean = false;

  loading: boolean = true;
  displayDetalle: boolean = false;
  claseSeleccionada: any = null;

  // Configuración del Calendario
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: false,
    eventClick: this.handleEventClick.bind(this),
    events: [],
    height: '100%',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }
  };

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esEstudiante = this.rolActual === 'estudiante';
      this.esStaff = this.rolActual === 'profesor' || this.rolActual === 'kinesiologo';

      await this.cargarAgenda();
    } catch (error) {
      this.mostrarError('Error al inicializar el calendario.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarAgenda() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      let clasesRaw: any[] = [];

      if (this.esEstudiante) {
        // 🔥 Llamada directa a la promesa
        clasesRaw = await this.claseService.obtenerMisClases() || [];
      } else if (this.esStaff) {
        // 🔥 Llamada directa a la promesa
        const misGrupos = await this.grupoService.obtenerMisGrupos() || [];
        const mapaGrupos = new Map(misGrupos.map((g: any) => [g.id, g.nombre]));

        // Una sola consulta para todos mis grupos (antes una por grupo)
        const respuesta = await this.claseService.listarClases({ grupoIds: misGrupos.map((g: any) => g.id), limite: 1000 });
        clasesRaw = (respuesta.registros || []).map((c: any) => ({
          ...c,
          grupoNombre: mapaGrupos.get(c.grupo_id) || 'Desconocido'
        }));
      }

      // Mapear clases al formato de FullCalendar
      this.calendarOptions.events = clasesRaw.map(c => {
        const fechaCorta = (c.fecha as string).substring(0, 10);
        const horaStr = c.hora || '00:00:00';
        
        return {
          id: c.id?.toString(),
          title: this.esEstudiante ? (c.objetivo || 'Entrenamiento') : `${c.grupoNombre} - ${c.lugar || 'Cancha'}`,
          start: `${fechaCorta}T${horaStr}`,
          backgroundColor: 'var(--pf-teal)',
          borderColor: 'var(--pf-teal)',
          textColor: '#ffffff',
          extendedProps: c
        };
      });

    } catch (error) {
      this.mostrarError('No se pudo cargar la agenda.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  handleEventClick(clickInfo: any) {
    this.claseSeleccionada = clickInfo.event.extendedProps;
    this.displayDetalle = true;
    this.cdr.detectChanges();
  }

  puedeVerPlanificacion(clase: any): boolean {
    if (this.esStaff) return true; // El staff siempre ve la planificación
    if (!clase.fecha || !clase.hora) return false;

    // El estudiante solo la ve si la clase ya comenzó
    const fechaCorta = (clase.fecha as string).substring(0, 10);
    const tiempoClase = new Date(`${fechaCorta}T${clase.hora}`).getTime();
    return tiempoClase <= new Date().getTime();
  }

  mostrarError(m: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: m });
  }
}