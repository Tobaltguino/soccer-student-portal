import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Módulos de PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 

// Nuevos Servicios y Enums
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import {TipoHistorialClinico, EstadoHistorialClinico } from "../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface";
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { from } from 'rxjs';

@Component({
  selector: 'app-administrador-historial-clinico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    DatePickerModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.css']
})
export class AdministradorHistorialClinicoComponent implements OnInit {

  // ✅ Exponemos los Enums para usarlos en el HTML
  readonly TipoHistorialClinico = TipoHistorialClinico;
  readonly EstadoHistorialClinico = EstadoHistorialClinico;

  private historialService = inject(HistorialClinicoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;
  mostrarDialogoLesion: boolean = false;
  lesionActual: any = {};

  // ✅ Opciones fuertemente tipadas basadas en el Enum
  opcionesTipoLesion = [
    { label: 'Lesión', value: TipoHistorialClinico.LESION },
    { label: 'Patología', value: TipoHistorialClinico.PATOLOGIA },
    { label: 'Alergia', value: TipoHistorialClinico.ALERGIA }
  ];

  opcionesEstadoLesion = [
    { label: 'En Observación', value: EstadoHistorialClinico.EN_OBSERVACION },
    { label: 'En Tratamiento', value: EstadoHistorialClinico.EN_TRATAMIENTO },
    { label: 'En Reintegro Deportivo', value: EstadoHistorialClinico.EN_REINTEGRO_DEPORTIVO },
    { label: 'Recuperado', value: EstadoHistorialClinico.RECUPERADO }
  ];

  ngOnInit() {
    this.cargarTodosLosAlumnos(); 
  }

  // ==========================================
  // CARGA GLOBAL DE ALUMNOS
  // ==========================================
  cargarTodosLosAlumnos() {
    // Pedimos todos los alumnos activos de la academia
    this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }).subscribe({
      next: (res) => {
        const alumnosBD = res.registros || [];
        this.listaAlumnos = alumnosBD.map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;
          
          return {
            id: idUsuario,
            nombreCompleto: `${nombre} ${apellido} ${rut ? '('+rut+')' : ''}`
          };
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pacientes.' });
      }
    });
  }

  onAlumnoChange() {
    if (this.alumnoSeleccionado) {
      this.cargarListaLesiones();
    } else {
      this.listaLesiones = [];
    }
  }

  cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.historialService.listarHistorialPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        this.listaLesiones = data || [];
        this.cargandoLesiones = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial clínico.' });
        this.cargandoLesiones = false;
      }
    });
  }

  // ==========================================
  // LOGÍSTICA DEL MODAL
  // ==========================================
  abrirNuevaLesion() {
    this.lesionActual = { 
      tipo: TipoHistorialClinico.LESION, 
      estado: EstadoHistorialClinico.EN_OBSERVACION, 
      fecha_evento: new Date() 
    };
    this.mostrarDialogoLesion = true;
  }

  abrirEditarLesion(lesion: any) {
    this.lesionActual = { ...lesion };
    
    // Convertimos el string a Date para el DatePicker
    if (this.lesionActual.fecha_evento) {
      const [year, month, day] = this.lesionActual.fecha_evento.split('T')[0].split('-');
      this.lesionActual.fecha_evento = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    this.mostrarDialogoLesion = true;
  }

  guardarLesion() {
    if (!this.lesionActual.tipo || !this.lesionActual.fecha_evento) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Complete fecha y tipo de registro.' });
      return;
    }

    let fechaFormateada = this.lesionActual.fecha_evento;
    if (this.lesionActual.fecha_evento instanceof Date) {
      const d = this.lesionActual.fecha_evento;
      const tzOffset = d.getTimezoneOffset() * 60000;
      fechaFormateada = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
    }

    // Adaptamos el payload exacto a lo que espera tu DTO
    const payload = {
      estudianteId: this.alumnoSeleccionado.id,
      tipo: this.lesionActual.tipo,
      diagnostico: this.lesionActual.diagnostico || '',
      fechaEvento: fechaFormateada,
      estado: this.lesionActual.estado,
      observaciones: this.lesionActual.observaciones || ''
    };

    const peticion$ = this.lesionActual.id 
      ? this.historialService.actualizarHistorial(this.lesionActual.id, payload)
      : this.historialService.crearHistorial(payload);

    peticion$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Registro actualizado correctamente.' });
        this.mostrarDialogoLesion = false;
        this.cargarListaLesiones();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro.' });
      }
    });
  }
  
  // ==========================================
  // BORRADO LÓGICO
  // ==========================================
  confirmarEliminarLesion(lesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar este registro de ${this.getTipoLabel(lesion.tipo)}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.historialService.eliminarHistorial(lesion.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado exitosamente.' });
            this.cargarListaLesiones(); 
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro.' });
          }
        });
      }
    });
  }

  // ==========================================
  // HELPERS UI
  // ==========================================
  getTipoLabel(tipo: string): string {
    const opt = this.opcionesTipoLesion.find(o => o.value === tipo);
    return opt ? opt.label : tipo;
  }

  getEstadoLabel(estado: string): string {
    const opt = this.opcionesEstadoLesion.find(o => o.value === estado);
    return opt ? opt.label : estado;
  }
}