import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG v18+
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

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, TextareaModule, SelectModule, TagModule, ToastModule, 
    ConfirmDialogModule, DatePickerModule, CheckboxModule, SelectButtonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-classes.html',
  styleUrls: ['./admin-classes.css']
})
export class AdminClassesComponent implements OnInit {

  clases: any[] = [];           
  clasesOriginales: any[] = []; 
  grupos: any[] = [];
  
  loading: boolean = true;
  displayDialog: boolean = false;
  displayAttendanceDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';

  // Control de Vistas del Formulario
  vistaFormulario: string = 'logistica'; // 'logistica' | 'planificacion'
  opcionesVistaForm = [
      { label: 'Logística', value: 'logistica', icon: 'pi pi-map-marker' },
      { label: 'Planificación', value: 'planificacion', icon: 'pi pi-list' }
  ];

  // Filtros
  filtroFecha: Date | null = null;
  filtroGrupoId: any = null;
  filtroLugar: string = ''; 

  // Asistencia
  claseSeleccionada: any = null;
  alumnosAsistencia: any[] = [];
  loadingAsistencia: boolean = false;

  // Formulario (Sin profesor_id, Sin tipo_entrenamiento)
  claseForm: any = {
    id: null, grupo_id: null, fecha: null, hora: null, lugar: '',
    objetivo: '', calentamiento: '', parte_principal: '', vuelta_calma: ''
  };

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.loading = true;
    
    // Cargar Clases
    const { data: dataClases } = await this.supabase.getClases();
    this.clasesOriginales = dataClases || [];
    this.aplicarFiltros(); 
    
    // Cargar Grupos
    const { data: dataGrupos } = await this.supabase.getGrupos();
    this.grupos = dataGrupos || [];
    
    this.loading = false;
    this.cdr.detectChanges();
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true; let cumpleGrupo = true; let cumpleLugar = true;
      
      if (this.filtroFecha) {
          cumpleFecha = clase.fecha === this.formatearFecha(this.filtroFecha);
      }
      if (this.filtroGrupoId) {
          cumpleGrupo = clase.grupo_id === this.filtroGrupoId;
      }
      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
          const lugarClase = (clase.lugar || '').toLowerCase();
          const busqueda = this.filtroLugar.toLowerCase();
          cumpleLugar = lugarClase.includes(busqueda);
      }
      
      return cumpleFecha && cumpleGrupo && cumpleLugar;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroLugar = '';
    this.aplicarFiltros();
  }

  // --- ASISTENCIA ---
  async verAsistencia(clase: any) {
    this.claseSeleccionada = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;

    // 1. Obtener alumnos del grupo
    const { data: alumnosGrupo } = await this.supabase.getAlumnosPorGrupo(clase.grupo_id);
    
    // 2. Obtener asistencia ya guardada (si existe)
    const { data: asistenciaGuardada } = await this.supabase.getAsistenciaPorClase(clase.id);

    if (alumnosGrupo) {
       // Fusionar
       this.alumnosAsistencia = alumnosGrupo.map(alumno => {
           const registro = asistenciaGuardada?.find((r: any) => r.estudiante_id === alumno.id);
           return { 
               ...alumno, 
               presente: registro ? registro.presente : false 
           };
       });
    }
    
    this.loadingAsistencia = false;
    this.cdr.detectChanges();
  }

  async guardarAsistencia() {
    const registros = this.alumnosAsistencia.map(a => ({
      clase_id: this.claseSeleccionada.id,
      estudiante_id: a.id,
      presente: a.presente
    }));

    const { error } = await this.supabase.saveAsistencia(registros);
    
    if (!error) {
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Asistencia actualizada correctamente' });
      this.displayAttendanceDialog = false;
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la asistencia' });
    }
  }

  // --- CRUD CLASES ---
  abrirNuevo() { 
    this.isEditing = false; 
    this.tituloDialogo = 'Nueva Clase'; 
    this.limpiarForm(); 
    this.vistaFormulario = 'logistica';
    this.displayDialog = true; 
  }
  
  abrirEditar(clase: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Clase';
    this.vistaFormulario = 'logistica';
    
    const fechaObj = new Date(clase.fecha + 'T00:00:00');
    const horaObj = new Date(`2000-01-01T${clase.hora}`);
    
    this.claseForm = { ...clase, fecha: fechaObj, hora: horaObj };
    this.displayDialog = true;
  }

  async guardarClase() {
    if (!this.claseForm.grupo_id || !this.claseForm.fecha || !this.claseForm.hora) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete Grupo, Fecha y Hora' });
        return;
    }

    const datosParaEnviar: any = {
      grupo_id: this.claseForm.grupo_id,
      fecha: this.formatearFecha(this.claseForm.fecha),
      hora: this.formatearHora(this.claseForm.hora),
      lugar: this.claseForm.lugar || '',
      objetivo: this.claseForm.objetivo || '',
      calentamiento: this.claseForm.calentamiento || '',
      parte_principal: this.claseForm.parte_principal || '',
      vuelta_calma: this.claseForm.vuelta_calma || ''
    };

    let result;
    if (this.isEditing) {
      result = await this.supabase.updateClase(this.claseForm.id, datosParaEnviar);
    } else {
      result = await this.supabase.createClase(datosParaEnviar);
    }

    if (result.error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: result.error.message });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase guardada' });
      this.displayDialog = false;
      await this.cargarDatos();
    }
  }

  eliminarClase(id: number) {
    this.confirmationService.confirm({
        message: '¿Estás seguro de eliminar esta clase y su asistencia?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger p-button-text',
        accept: async () => { 
            await this.supabase.deleteClase(id); 
            this.cargarDatos(); 
        } 
    });
  }

  limpiarForm() { 
    this.claseForm = { 
        id: null, grupo_id: null, fecha: null, hora: null, lugar: '', 
        objetivo: '', calentamiento: '', parte_principal: '', vuelta_calma: '' 
    }; 
  }

  formatearFecha(date: Date | null): string { 
      if (!date) return ''; 
      return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`; 
  }
  
  formatearHora(date: Date | null): string { 
      if (!date) return ''; 
      return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2); 
  }
}