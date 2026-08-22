import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// RxJS
import { forkJoin } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

// Dominios: Clases
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, CrearClasePayload, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

// Dominios: Grupos
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

// Dominios: Asistencias y Estudiantes
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-administrador-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, TagModule, ToastModule,
    ConfirmDialogModule, DatePickerModule, CheckboxModule, SelectButtonModule,
    TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss']
})
export class AdministradorClasesComponent implements OnInit {

  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService); 
  private estudianteService = inject(EstudianteService); 
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  clases: Clase[] = [];
  totalRegistros: number = 0;
  grupos: Grupo[] = []; 

  loading: boolean = true;
  displayDialog: boolean = false;
  displayAttendanceDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';

  vistaFormulario: string = 'logistica';
  opcionesVistaForm = [
      { label: 'Logística', value: 'logistica', icon: 'pi pi-map-marker' },
      { label: 'Planificación', value: 'planificacion', icon: 'pi pi-list' }
  ];

  filtroFecha: Date | null = null;
  filtroGrupoId: number | null = null;
  filtroLugar: string = '';

  claseSeleccionada: Clase | null = null;
  alumnosAsistencia: any[] = [];
  
  // 🔥 Variables de Bloqueo
  loadingAsistencia: boolean = false;
  guardando: boolean = false;

  claseForm: Partial<Clase> = this.getFormularioVacio();

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges(); // Forzar visualización de carga

    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data;
        this.aplicarFiltros(); 
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    this.loading = true;
    this.cdr.detectChanges(); // 🔥 OBLIGAMOS a Angular a mostrar el cargador

    const filtros: FiltrosClase = {
      grupoId: this.filtroGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100 
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        this.clases = response.registros;
        this.totalRegistros = response.total;
        this.loading = false;
        this.cdr.detectChanges(); // 🔥 Refrescar vista con datos
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
        this.loading = false;
        this.cdr.detectChanges(); // 🔥 Apagar cargador en caso de error
      }
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroLugar = '';
    this.aplicarFiltros();
  }

  // --- LÓGICA DE ASISTENCIA ---
  verAsistencia(clase: Clase) {
    this.claseSeleccionada = clase; 
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.alumnosAsistencia = [];
    this.cdr.detectChanges(); // 🔥 Forzamos que se abra el modal y empiece a cargar visualmente

    if (!clase.grupo_id || !clase.id) {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      estudiantes: this.estudianteService.listarEstudiantes({ grupoIds: [clase.grupo_id], limite: 1000, activo: true }),
      asistenciasGuardadas: this.asistenciaService.listarPorClase(clase.id)
    }).subscribe({
      next: ({ estudiantes, asistenciasGuardadas }) => {
        
        const asistenciasMap = new Map();
        asistenciasGuardadas.forEach(a => asistenciasMap.set(a.estudiante_id, a.presente));

        this.alumnosAsistencia = estudiantes.registros.map(est => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
          const nombre = est.perfil ? est.perfil.nombre : (est as any).nombre;
          const apellido = est.perfil ? est.perfil.apellido : (est as any).apellido;

          return {
            estudianteId: idUsuario,
            nombre: nombre,
            apellido: apellido,
            presente: asistenciasMap.has(idUsuario) ? asistenciasMap.get(idUsuario) : false 
          };
        });

        this.loadingAsistencia = false;
        this.cdr.detectChanges(); // 🔥 Avisar a la tabla que ya tenemos datos
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la asistencia' });
        this.loadingAsistencia = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarAsistencia() {
    if (this.loadingAsistencia) return;
    if (!this.claseSeleccionada || !this.claseSeleccionada.id) return; 

    this.loadingAsistencia = true;
    this.cdr.detectChanges(); // 🔥 Bloquea el botón visualmente

    const payload = {
      asistencias: this.alumnosAsistencia.map(alumno => ({
        estudianteId: alumno.estudianteId,
        presente: alumno.presente 
      }))
    };

    this.asistenciaService.registrarLote(this.claseSeleccionada.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia guardada correctamente' });
        this.displayAttendanceDialog = false;
        this.loadingAsistencia = false; 
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo guardar la asistencia' });
        this.loadingAsistencia = false; 
        this.cdr.detectChanges();
      }
    });
  }

  // --- LÓGICA DE CLASES (LOGÍSTICA/PLANIFICACIÓN) ---
  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nueva Clase';
    this.claseForm = this.getFormularioVacio();
    this.vistaFormulario = 'logistica';

    const ahora = new Date();
    this.claseForm.hora = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2);

    this.displayDialog = true;
  }

  abrirEditar(clase: Clase) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Clase';
    this.vistaFormulario = 'logistica';

    this.claseForm = { ...clase };
    
    if (this.claseForm.fecha) {
      const parts = (this.claseForm.fecha as string).split('-');
      if (parts.length === 3) {
          this.claseForm.fecha = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) as any;
      }
    }

    this.displayDialog = true;
  }

  guardarClase() {
    if (this.guardando) return;

    if (!this.claseForm.grupo_id || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios (*)' });
        return;
    }

    this.guardando = true;
    this.cdr.detectChanges(); // 🔥 Mostramos el loader de pantalla completa

    const datosParaEnviar: CrearClasePayload = {
      grupoId: this.claseForm.grupo_id,
      fecha: this.formatearFecha(this.claseForm.fecha as unknown as Date),
      hora: this.claseForm.hora,
      lugar: this.claseForm.lugar?.trim(),
      objetivo: this.claseForm.objetivo?.trim() || undefined,
      calentamiento: this.claseForm.calentamiento?.trim() || undefined,
      partePrincipal: this.claseForm.parte_principal?.trim() || undefined,
      vueltaCalma: this.claseForm.vuelta_calma?.trim() || undefined
    };

    if (this.isEditing && this.claseForm.id) {
      this.claseService.actualizarClase(this.claseForm.id, datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado('Clase actualizada correctamente'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    } else {
      this.claseService.crearClase(datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado('Clase creada correctamente'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    }
  }

  private finalizarGuardado(mensaje: string) {
    this.guardando = false; 
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.cdr.detectChanges(); // 🔥 Refrescamos la vista para quitar el loader oscuro
    this.aplicarFiltros();
  }

  private mostrarErrorGuardado(err: any) {
    this.guardando = false; 
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Ocurrió un error al guardar' });
    this.cdr.detectChanges(); // 🔥 Refrescamos la vista para quitar el loader oscuro en caso de error
  }

  eliminarClase(id: number) {
    this.confirmationService.confirm({
        message: '¿Estás seguro de eliminar esta clase y su asistencia? Esta acción no se puede deshacer.',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        accept: () => {
            this.claseService.eliminarClase(id).subscribe({
              next: () => {
                this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Clase eliminada' });
                this.aplicarFiltros();
              },
              error: (err) => {
                const msg = err.error?.message || 'No se pudo eliminar la clase';
                this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
              }
            });
        }
    });
  }

  private getFormularioVacio(): Partial<Clase> {
    return {
        grupo_id: undefined, fecha: undefined, hora: undefined, lugar: undefined,
        objetivo: undefined, calentamiento: undefined, parte_principal: undefined, vuelta_calma: undefined
    };
  }

  // 🔥 Función protegida contra errores de fechas corruptas
  formatearFecha(date: any): string {
      if (!date) return '';
      try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
      } catch (e) {
          return '';
      }
  }
}