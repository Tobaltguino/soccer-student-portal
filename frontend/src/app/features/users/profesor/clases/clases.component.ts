import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { MessageService } from 'primeng/api';

// Dominios
import { ClaseService } from '../../../../core/domains/clases/services/clase.service';
import { Clase, CrearClasePayload, FiltrosClase } from '../../../../core/domains/clases/models/clase.interface';

@Component({
  selector: 'app-profesor-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, SelectButtonModule, CheckboxModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.css']
})
export class ProfesorClasesComponent implements OnInit {
  
  // Inyección moderna de dependencias
  private claseService = inject(ClaseService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Datos
  grupos: any[] = []; // TODO: Reemplazar con interfaz Grupo desde GrupoService
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

  // Asistencia (NUEVO)
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
    
    // TODO: Implementar llamada a GrupoService para obtener los grupos del profesor
    // this.grupoService.obtenerMisGrupos().subscribe(...)
    
    this.cargarClasesPorGrupo();
  }

  cargarClasesPorGrupo() {
    this.loading = true;

    const filtros: FiltrosClase = {
      grupoId: this.selectedGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        let registros = response.registros;

        if (this.filtroLugar && this.filtroLugar.trim() !== '') {
          const busqueda = this.filtroLugar.toLowerCase();
          registros = registros.filter(c => c.lugar?.toLowerCase().includes(busqueda));
        }

        this.clasesOriginales = registros;
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
    // TODO: Implementar AsistenciaService
    this.loadingAsistencia = false;
  }

  guardarAsistencia() {
    // TODO: Implementar AsistenciaService
  }

  // --- FORMULARIO CREAR / EDITAR ---
  abrirNuevaClase() {
    if (!this.selectedGrupoId) return;
    this.isEditing = false;
    this.vistaFormulario = 'logistica';
    
    this.claseForm = this.getFormularioVacio();
    this.claseForm.grupo_id = this.selectedGrupoId;

    this.displayForm = true;
  }

  abrirEditarClase(clase: Clase) {
    this.isEditing = true;
    this.vistaFormulario = 'logistica';
    
    this.claseForm = { ...clase };
    
    if (this.claseForm.fecha) {
      this.claseForm.fecha = new Date(this.claseForm.fecha + 'T00:00:00') as any;
    }
    
    this.displayForm = true;
  }

  guardarClase() {
    if (!this.selectedGrupoId || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
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
      grupoId: this.selectedGrupoId,
      fecha: this.formatearFecha(fechaSeleccionada),
      hora: this.claseForm.hora,
      lugar: this.claseForm.lugar ?? undefined,
      objetivo: this.claseForm.objetivo ?? undefined,
      calentamiento: this.claseForm.calentamiento ?? undefined,
      partePrincipal: this.claseForm.parte_principal ?? undefined,
      vueltaCalma: this.claseForm.vuelta_calma ?? undefined
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