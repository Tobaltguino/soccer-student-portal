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
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CheckboxModule } from 'primeng/checkbox';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, TextareaModule, SelectModule, TagModule, ToastModule, 
    ConfirmDialogModule, DatePickerModule, TabsModule, InputGroupModule, 
    InputGroupAddonModule, CheckboxModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-classes.html', // <--- ¡AQUÍ ESTABA EL ERROR, YA ESTÁ CORREGIDO!
  styleUrls: ['./admin-classes.css']
})
export class AdminClassesComponent implements OnInit {

  clases: any[] = [];           
  clasesOriginales: any[] = []; 
  grupos: any[] = [];
  profesores: any[] = [];
  profesoresFiltrados: any[] = []; // Lista filtrada para el modal
  loading: boolean = true;
  
  displayDialog: boolean = false;
  displayAttendanceDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';
  activeTab: string = '0';

  // Filtros
  filtroFecha: Date | null = null;
  filtroGrupoId: any = null;
  filtroProfesorId: any = null;

  // Asistencia
  claseSeleccionada: any = null;
  alumnosAsistencia: any[] = [];
  loadingAsistencia: boolean = false;

  claseForm: any = {
    id: null, grupo_id: null, profesor_id: null, fecha: null, hora: null, lugar: '',
    tipo_entrenamiento: 'GENERAL', objetivo: '', calentamiento: '', parte_principal: '', vuelta_calma: ''
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
    const { data: dataClases } = await this.supabase.getClases();
    this.clasesOriginales = dataClases || [];
    this.aplicarFiltros(); 
    
    const { data: dataGrupos } = await this.supabase.getGrupos();
    this.grupos = dataGrupos || [];
    
    const { data: dataProfes } = await this.supabase.getProfesores();
    this.profesores = (dataProfes || []).map((p: any) => ({
      ...p, nombreCompleto: `${p.nombre} ${p.apellido}`
    }));
    
    this.loading = false;
    this.cdr.detectChanges();
  }

  // --- LÓGICA DE FILTRADO DE PROFESORES ---
  onGrupoChange(grupoId: number) {
    if (!grupoId) {
      this.profesoresFiltrados = [];
      this.claseForm.profesor_id = null;
      return;
    }
    // Filtramos solo los profes que tengan asignado este grupo
    this.profesoresFiltrados = this.profesores.filter(profe => 
      profe.grupos_profesores?.some((gp: any) => gp.grupo_id === grupoId)
    );
    // Si el profe seleccionado no pertenece al nuevo grupo, lo quitamos
    if (this.claseForm.profesor_id && !this.profesoresFiltrados.some(p => p.id === this.claseForm.profesor_id)) {
      this.claseForm.profesor_id = null;
    }
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true, cumpleGrupo = true, cumpleProfe = true;
      if (this.filtroFecha) cumpleFecha = clase.fecha === this.formatearFecha(this.filtroFecha);
      if (this.filtroGrupoId) cumpleGrupo = clase.grupo_id === this.filtroGrupoId;
      if (this.filtroProfesorId) cumpleProfe = clase.profesor_id === this.filtroProfesorId;
      return cumpleFecha && cumpleGrupo && cumpleProfe;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroProfesorId = null;
    this.aplicarFiltros();
  }

  async verAsistencia(clase: any) {
    this.claseSeleccionada = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    const { data } = await this.supabase.getAlumnosPorGrupo(clase.grupo_id);
    if (data) {
       // Aquí podrías cargar la asistencia real si ya existe en BD, 
       // por ahora asumimos 'todos presentes' o vacíos para marcar.
       // Si quieres cargar lo guardado, necesitarías un getAsistenciaPorClase(clase.id)
       this.alumnosAsistencia = data.map(a => ({ ...a, presente: true }));
    }
    this.loadingAsistencia = false;
    this.cdr.detectChanges();
  }

  async guardarAsistencia() {
    const registros = this.alumnosAsistencia.map(a => ({
      clase_id: this.claseSeleccionada.id,
      alumno_id: a.id,
      estado: a.presente ? 'PRESENTE' : 'AUSENTE'
    }));
    const { error } = await this.supabase.saveAsistencia(registros);
    if (!error) {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia guardada' });
      this.displayAttendanceDialog = false;
    }
  }

  abrirNuevo() { 
    this.isEditing = false; 
    this.tituloDialogo = 'Nueva Clase'; 
    this.limpiarForm(); 
    this.displayDialog = true; 
  }
  
  abrirEditar(clase: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Clase';
    const fechaObj = new Date(clase.fecha + 'T00:00:00');
    const horaObj = new Date(`2000-01-01T${clase.hora}`);
    this.claseForm = { ...clase, fecha: fechaObj, hora: horaObj };
    
    // Al editar, cargamos los profes del grupo seleccionado
    this.onGrupoChange(clase.grupo_id);
    
    this.displayDialog = true;
  }

  async guardarClase() {
    const datosParaEnviar: any = {
      grupo_id: this.claseForm.grupo_id,
      profesor_id: this.claseForm.profesor_id,
      fecha: this.formatearFecha(this.claseForm.fecha),
      hora: this.formatearHora(this.claseForm.hora),
      lugar: this.claseForm.lugar || '',
      tipo_entrenamiento: this.claseForm.tipo_entrenamiento || 'GENERAL',
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
    this.confirmationService.confirm({ message: '¿Eliminar clase?', accept: async () => { await this.supabase.deleteClase(id); this.cargarDatos(); } });
  }

  limpiarForm() { 
    this.claseForm = { id: null, grupo_id: null, profesor_id: null, fecha: null, hora: null, lugar: '', tipo_entrenamiento: 'GENERAL' }; 
    this.profesoresFiltrados = [];
    this.activeTab = '0'; 
  }

  formatearFecha(date: Date | null): string { if (!date) return ''; return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`; }
  formatearHora(date: Date | null): string { if (!date) return ''; return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2); }
}