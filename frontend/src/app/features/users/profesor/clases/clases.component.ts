import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// RxJS
import { forkJoin } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado

// Clases
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, CrearClasePayload, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

// Grupo
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

// Asistencia y Estudiantes
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-profesor-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, SelectButtonModule, CheckboxModule, ToastModule,
    TextareaModule, ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss'] // 🔥 Cambiado a .scss
})
export class ProfesorClasesComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService); 
  private estudianteService = inject(EstudianteService); 
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Datos
  grupos: Grupo[] = []; 
  selectedGrupoId: number | null = null;
  clases: Clase[] = [];
  clasesOriginales: Clase[] = [];
  
  // Estados
  loading: boolean = true;
  saving: boolean = false;
  
  // Filtros
  filtroFecha: Date | null = null;
  filtroLugar: string = '';

  // Vista de detalles
  displayPlan: boolean = false;
  selectedClase: Clase | null = null;

  // Formulario Crear/Editar
  displayForm: boolean = false;
  isEditing: boolean = false;
  claseForm: Partial<Clase> = this.getFormularioVacio();

  // Asistencia
  displayAttendanceDialog: boolean = false;
  alumnosAsistencia: any[] = [];
  loadingAsistencia: boolean = false;
  claseSeleccionadaAsistencia: Clase | null = null;
  
  // Pestañas del Formulario
  vistaFormulario: string = 'logistica';
  opcionesVistaForm = [
    { label: 'Logística', value: 'logistica', icon: 'pi pi-calendar' },
    { label: 'Planificación', value: 'planificacion', icon: 'pi pi-list' }
  ];

  ngOnInit() {
    this.cargarGrupos();
  }

  // --- CARGA DE DATOS ---
  cargarGrupos() {
    this.loading = true;
    
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        // 🔥 FIX: Usamos setTimeout para "patear" la actualización al siguiente ciclo de Angular
        // Esto evita el error NG0100 si el servicio responde de manera síncrona/muy rápido.
        setTimeout(() => {
          this.grupos = data;
          this.cargarClasesPorGrupo(); 
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus grupos asignados' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarClasesPorGrupo() {
    this.loading = true;

    const filtros: FiltrosClase = {
      grupoId: this.selectedGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100 
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        this.clasesOriginales = response.registros;
        this.clases = [...this.clasesOriginales];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onGrupoChange() {
    this.cargarClasesPorGrupo();
  }

  // --- ASISTENCIA ---
  verAsistencia(clase: Clase) {
    this.claseSeleccionadaAsistencia = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.alumnosAsistencia = [];

    if (!clase.grupo_id || !clase.id) {
      this.loadingAsistencia = false;
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la asistencia' });
        this.loadingAsistencia = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarAsistencia() {
    if (!this.claseSeleccionadaAsistencia || !this.claseSeleccionadaAsistencia.id) return;

    this.loadingAsistencia = true;

    const payload = {
      asistencias: this.alumnosAsistencia.map(alumno => ({
        estudianteId: alumno.estudianteId,
        presente: alumno.presente 
      }))
    };

    this.asistenciaService.registrarLote(this.claseSeleccionadaAsistencia.id, payload).subscribe({
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

  // --- FORMULARIO CREAR / EDITAR ---
  abrirNuevaClase() {
    if (!this.selectedGrupoId) {
      this.messageService.add({ severity: 'info', summary: 'Atención', detail: 'Seleccione un grupo primero' });
      return;
    }
    
    this.isEditing = false;
    this.vistaFormulario = 'logistica';
    
    this.claseForm = this.getFormularioVacio();
    this.claseForm.grupo_id = this.selectedGrupoId;

    const ahora = new Date();
    this.claseForm.hora = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2);

    this.displayForm = true;
  }

  abrirEditarClase(clase: Clase) {
    this.isEditing = true;
    this.vistaFormulario = 'logistica';
    
    this.claseForm = { ...clase };
    
    if (this.claseForm.fecha) {
      const [year, month, day] = (this.claseForm.fecha as string).split('-');
      this.claseForm.fecha = new Date(Number(year), Number(month) - 1, Number(day)) as any;
    }
    
    this.displayForm = true;
  }

  guardarClase() {
    const grupoIdFinal = this.isEditing ? this.claseForm.grupo_id : this.selectedGrupoId;

    if (!grupoIdFinal || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Faltan datos', 
            detail: 'Complete todos los campos obligatorios de Logística (*).' 
        });
        return;
    }

    const fechaSeleccionada = this.claseForm.fecha as unknown as Date;
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Fecha Inválida', 
            detail: 'Ingrese una fecha válida para la clase.' 
        });
        return;
    }

    this.saving = true;

    const datosParaEnviar: CrearClasePayload = {
      grupoId: grupoIdFinal,
      fecha: this.formatearFecha(fechaSeleccionada),
      hora: this.claseForm.hora,
      lugar: this.claseForm.lugar?.trim() || undefined,
      objetivo: this.claseForm.objetivo?.trim() || undefined,
      calentamiento: this.claseForm.calentamiento?.trim() || undefined,
      partePrincipal: this.claseForm.parte_principal?.trim() || undefined,
      vueltaCalma: this.claseForm.vuelta_calma?.trim() || undefined
    };

    if (this.isEditing && this.claseForm.id) {
      this.claseService.actualizarClase(this.claseForm.id, datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado('Clase actualizada correctamente.'),
        error: (err) => this.mostrarErrorGuardado()
      });
    } else {
      this.claseService.crearClase(datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado('Clase creada correctamente.'),
        error: (err) => this.mostrarErrorGuardado()
      });
    }
  }

  private finalizarGuardado(mensaje: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.displayForm = false;
    this.saving = false;
    this.cargarClasesPorGrupo();
  }

  private mostrarErrorGuardado() {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al guardar la clase.' });
    this.saving = false;
    this.cdr.detectChanges();
  }

  // --- UTILIDADES ---
  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  aplicarFiltros() {
    this.cargarClasesPorGrupo();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.cargarClasesPorGrupo();
  }

  private getFormularioVacio(): Partial<Clase> {
    return {
      grupo_id: undefined,
      fecha: undefined,
      hora: undefined,
      lugar: undefined,
      objetivo: undefined,
      calentamiento: undefined,
      parte_principal: undefined,
      vuelta_calma: undefined
    };
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}