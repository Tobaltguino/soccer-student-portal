import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TextareaModule } from 'primeng/textarea';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, ToastModule, InputNumberModule,
    DatePickerModule, TagModule, ConfirmDialogModule, TextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {
  sesiones: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = []; 
  
  loading: boolean = true;
  displayTipoDialog: boolean = false;   
  displayMainDialog: boolean = false;   
  displayGradesDialog: boolean = false; 
  currentUserId: string | null = null;

  // ACTUALIZADO: Se agregan valores por defecto para min y max
  tipoForm: any = { nombre: '', descripcion: '', unidad_medida: '', valor_min: 0, valor_max: 100 };
  
  evalLogistica: any = { id: null, grupo_id: null, tipo_evaluacion_id: null, fecha: new Date() };

  constructor(
    private supabase: SupabaseService, 
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() { 
    await this.obtenerUsuarioActual();
    await this.cargarDatos(); 
  }

  async obtenerUsuarioActual() {
    const { data: { user } } = await this.supabase.getUser();
    if (user) this.currentUserId = user.id;
  }

  async cargarDatos() {
    this.loading = true;
    try {
      const { data: sesionesData } = await this.supabase.getSesionesEvaluacion();
      this.sesiones = sesionesData || [];
      const { data: tipos } = await this.supabase.getTiposEvaluacion();
      this.tiposEvaluacion = tipos || [];
      const { data: gps } = await this.supabase.getGrupos();
      this.grupos = gps || [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- CONFIGURAR TEST (TIPOS) ---
  abrirNuevoTipo() {
    // Reseteamos el formulario incluyendo min y max
    this.tipoForm = { nombre: '', descripcion: '', unidad_medida: '', valor_min: 0, valor_max: 100 };
    this.displayTipoDialog = true;
    this.cdr.detectChanges();
  }

  async guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', detail: 'Nombre y Unidad son obligatorios' });
      return;
    }

    // NUEVO: Validación de rangos
    if (this.tipoForm.valor_min >= this.tipoForm.valor_max) {
      this.messageService.add({ severity: 'error', detail: 'El valor mínimo debe ser menor al máximo.' });
      return;
    }

    const { error } = await this.supabase.createTipoEvaluacion(this.tipoForm);
    if (!error) {
      this.messageService.add({ severity: 'success', detail: 'Test configurado correctamente' });
      this.displayTipoDialog = false;
      await this.cargarDatos();
    } else {
      this.messageService.add({ severity: 'error', detail: error.message });
    }
  }

  async eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Eliminar este tipo de test? Esto solo funcionará si no hay sesiones registradas con él.',
      header: 'Confirmar Eliminación de Test',
      icon: 'pi pi-exclamation-circle',
      accept: async () => {
        const { error } = await this.supabase.eliminarTipoEvaluacion(id);
        if (error) {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'No se puede eliminar', 
            detail: 'Este test ya tiene sesiones grabadas y no puede borrarse.' 
          });
        } else {
          this.messageService.add({ severity: 'success', detail: 'Test eliminado correctamente' });
          await this.cargarDatos(); 
        }
      }
    });
  }

  // --- SESIONES (LOGÍSTICA) ---
  abrirNuevo() {
    this.evalLogistica = { id: null, grupo_id: null, tipo_evaluacion_id: null, fecha: new Date() };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    this.evalLogistica = { ...sesion, fecha: new Date(sesion.fecha + 'T00:00:00') };
    this.displayMainDialog = true;
  }

  async crearSesionPlanificada() {
    const datosSesion = {
      grupo_id: this.evalLogistica.grupo_id,
      tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
      fecha: this.formatearFecha(this.evalLogistica.fecha),
      profesor_id: this.currentUserId,
      estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    let res;
    if (this.evalLogistica.id) {
      res = await this.supabase.supabase.from('evaluaciones_sesiones').update(datosSesion).eq('id', this.evalLogistica.id);
    } else {
      res = await this.supabase.crearSesionEvaluacion(datosSesion);
    }

    if (!res.error) {
      this.messageService.add({ severity: 'success', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      await this.cargarDatos();
    }
  }

  // --- CALIFICACIÓN ---
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion, fecha: new Date(sesion.fecha + 'T00:00:00') };
    this.loading = true;
    const { data: alumnos } = await this.supabase.getAlumnosPorGrupo(sesion.grupo_id);
    const { data: notas } = await this.supabase.getResultadosPorSesion(sesion.id);

    if (alumnos) {
      this.estudiantesGrupo = alumnos.map(est => {
        const notaPrev = notas?.find(n => n.estudiante_id === est.id);
        return {
          id: est.id, nombre: est.nombre, apellido: est.apellido,
          valor_numerico: notaPrev ? notaPrev.valor_numerico : null,
          observacion: notaPrev ? notaPrev.observacion : ''
        };
      });
      this.displayGradesDialog = true;
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  limpiarFila(est: any) {
    est.valor_numerico = null;
    est.observacion = '';
  }

  async guardarNotasFinales() {
    const registros = this.estudiantesGrupo
      .filter(est => est.valor_numerico !== null)
      .map(est => ({
        sesion_id: this.evalLogistica.id,
        estudiante_id: est.id,
        valor_numerico: est.valor_numerico,
        observacion: est.observacion || ''
      }));

    this.loading = true;
    const { error } = await this.supabase.guardarResultadosMasivos(registros);
    if (!error) {
      await this.supabase.supabase.from('evaluaciones_sesiones').update({ estado: 'COMPLETADA' }).eq('id', this.evalLogistica.id);
      this.messageService.add({ severity: 'success', detail: 'Notas guardadas' });
      this.displayGradesDialog = false;
      await this.cargarDatos();
    }
    this.loading = false;
  }

  eliminarSesion(id: string) {
    this.confirmationService.confirm({
      message: '¿Eliminar sesión permanentemente?',
      accept: async () => {
        await this.supabase.eliminarSesionEvaluacion(id);
        await this.cargarDatos();
      }
    });
  }

  formatearFecha(date: Date): string {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
  }
}