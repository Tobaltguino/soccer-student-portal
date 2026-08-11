import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

// Dominios
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, CrearClasePayload, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

@Component({
  selector: 'app-administrador-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, TextareaModule, SelectModule, TagModule, ToastModule, 
    ConfirmDialogModule, DatePickerModule, CheckboxModule, SelectButtonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.css']
})
export class AdministradorClasesComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  clases: Clase[] = [];           
  totalRegistros: number = 0;
  grupos: any[] = []; // TODO: Reemplazar cuando exista GrupoService
  
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
  loadingAsistencia: boolean = false;

  claseForm: Partial<Clase> = this.getFormularioVacio();

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.aplicarFiltros(); 
  }

  aplicarFiltros() {
    this.loading = true;
    
    const filtros: FiltrosClase = {
      grupoId: this.filtroGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        this.clases = response.registros;
        this.totalRegistros = response.total;
        
        if (this.filtroLugar && this.filtroLugar.trim() !== '') {
          const busqueda = this.filtroLugar.toLowerCase();
          this.clases = this.clases.filter(c => c.lugar?.toLowerCase().includes(busqueda));
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
        this.loading = false;
      }
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroLugar = '';
    this.aplicarFiltros();
  }

  verAsistencia(clase: Clase) {
    this.claseSeleccionada = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.loadingAsistencia = false;
  }

  guardarAsistencia() {}

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
      this.claseForm.fecha = new Date(this.claseForm.fecha + 'T00:00:00') as any; 
    }
    
    this.displayDialog = true;
  }

  guardarClase() {
    if (!this.claseForm.grupo_id || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios (*)' });
        return;
    }

    // AQUI ESTÁ LA SOLUCIÓN: Usamos ?? undefined para convertir nulls a undefined
    const datosParaEnviar: CrearClasePayload = {
      grupoId: this.claseForm.grupo_id,
      fecha: this.formatearFecha(this.claseForm.fecha as unknown as Date),
      hora: this.claseForm.hora, 
      lugar: this.claseForm.lugar ?? undefined,
      objetivo: this.claseForm.objetivo ?? undefined,
      calentamiento: this.claseForm.calentamiento ?? undefined,
      partePrincipal: this.claseForm.parte_principal ?? undefined,
      vueltaCalma: this.claseForm.vuelta_calma ?? undefined
    };

    if (this.isEditing && this.claseForm.id) {
      this.claseService.actualizarClase(this.claseForm.id, datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    } else {
      this.claseService.crearClase(datosParaEnviar).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    }
  }

  private finalizarGuardado() {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase guardada correctamente' });
    this.displayDialog = false;
    this.aplicarFiltros();
  }

  private mostrarErrorGuardado(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Ocurrió un error al guardar' });
  }

  eliminarClase(id: number) {
    this.confirmationService.confirm({
        message: '¿Estás seguro de eliminar esta clase y su asistencia?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger p-button-text',
        accept: () => { 
            this.claseService.eliminarClase(id).subscribe({
              next: () => {
                this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Clase eliminada' });
                this.aplicarFiltros();
              },
              error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' })
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

  formatearFecha(date: Date | null): string { 
      if (!date) return ''; 
      return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`; 
  }
}