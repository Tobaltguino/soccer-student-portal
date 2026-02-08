import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- 1. IMPORTAR ESTO
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber'; 
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {

  // Datos
  sesiones: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = [];

  // Estados
  loading: boolean = true;
  displayMainDialog: boolean = false;
  displayTipoDialog: boolean = false;
  displayGradesDialog: boolean = false;

  // Formularios
  tipoForm: any = { nombre: '', unidad_medida: '' };

  evalLogistica: any = {
    id: null,
    grupo_id: null,
    tipo_evaluacion_id: null,
    fecha: new Date(),
    estado: 'PENDIENTE'
  };

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef // <--- 2. INYECTAR ESTO
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // --- CARGA DE DATOS (Con actualización forzada) ---
  async cargarDatosIniciales() {
    this.loading = true;
    this.cdr.detectChanges(); // Forzamos que se muestre el spinner

    try {
      const [g, t, s] = await Promise.all([
        this.supabase.getGrupos(),
        this.supabase.getTiposEvaluacion(),
        this.supabase.getSesionesEvaluacion()
      ]);

      this.grupos = g.data || [];
      this.tiposEvaluacion = t.data || [];
      this.sesiones = s.data || [];

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo de conexión' });
    } finally {
      // 3. LA SOLUCIÓN MÁGICA:
      this.loading = false;
      this.cdr.detectChanges(); // <--- OBLIGA A ANGULAR A QUITAR EL SPINNER
    }
  }

  // ==========================================
  //      GESTIÓN DE TIPOS
  // ==========================================
  abrirNuevoTipo() {
    this.tipoForm = { nombre: '', unidad_medida: '' };
    this.displayTipoDialog = true;
  }

  async guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Faltan datos' });
      return;
    }
    const { error } = await this.supabase.createTipoEvaluacion(this.tipoForm);
    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Test creado' });
      this.displayTipoDialog = false;
      
      // Recarga parcial
      const { data } = await this.supabase.getTiposEvaluacion();
      this.tiposEvaluacion = data || [];
      this.cdr.detectChanges(); // <--- Actualizar vista
    }
  }

  eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Borrar este test?',
      accept: async () => {
        const { error } = await this.supabase.eliminarTipoEvaluacion(id);
        if (!error) {
          const { data } = await this.supabase.getTiposEvaluacion();
          this.tiposEvaluacion = data || [];
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Test borrado' });
          this.cdr.detectChanges(); // <--- Actualizar vista
        }
      }
    });
  }

  // ==========================================
  //      GESTIÓN DE SESIONES
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = { id: null, grupo_id: null, tipo_evaluacion_id: null, fecha: new Date(), estado: 'PENDIENTE' };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { ...sesion, fecha: fechaObj };
    this.displayMainDialog = true;
  }

  // En admin-evaluations.ts

  async crearSesionPlanificada() {
    if (!this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona grupo y prueba' });
        return;
    }

    // Convertir fecha a string YYYY-MM-DD
    const fechaStr = this.evalLogistica.fecha.toISOString().split('T')[0];

    const payload = {
        grupo_id: this.evalLogistica.grupo_id,
        tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaStr,
        estado: this.evalLogistica.estado || 'PENDIENTE' // Mantener estado actual si se edita
    };

    let result;

    // ✅ LÓGICA DE EDICIÓN CORREGIDA:
    if (this.evalLogistica.id) {
       // Si existe ID, actualizamos
       result = await this.supabase.updateSesionEvaluacion(this.evalLogistica.id, payload);
    } else {
       // Si no, creamos
       result = await this.supabase.crearSesionEvaluacion(payload);
    }

    if (result.error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: result.error.message });
    } else {
        const accion = this.evalLogistica.id ? 'actualizada' : 'creada';
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: `Sesión ${accion} correctamente` });
        
        this.displayMainDialog = false;
        this.cargarDatosIniciales(); // Recargar tabla
    }
  }

  eliminarSesion(id: string) {
      this.confirmationService.confirm({
          message: '¿Eliminar sesión y notas?',
          accept: async () => {
              await this.supabase.eliminarSesionEvaluacion(id);
              this.cargarDatosIniciales();
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sesión borrada' });
          }
      });
  }

  // ==========================================
  //      CALIFICACIÓN (Con actualización forzada)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); // <--- Mostrar spinner inmediatamente

    try {
      const { data: alumnos } = await this.supabase.getAlumnosPorGrupo(sesion.grupo_id);
      const { data: resultados } = await this.supabase.getResultadosPorSesion(sesion.id);

      this.estudiantesGrupo = (alumnos || []).map((alumno: any) => {
          const notaExistente = resultados?.find((r: any) => r.estudiante_id === alumno.id);
          return {
              estudiante_id: alumno.id,
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
      });
      
      this.displayGradesDialog = true;

    } catch (e) {
      console.error(e);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando alumnos' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // <--- OBLIGAR A QUE APAREZCA EL MODAL Y SE VAYA EL SPINNER
    }
  }

  limpiarFila(estudiante: any) {
    estudiante.valor_numerico = null;
    estudiante.observacion = '';
  }

  async guardarNotasFinales() {
    const notasAGuardar = this.estudiantesGrupo
        .filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''))
        .map(e => ({
            sesion_id: this.evalLogistica.id,
            estudiante_id: e.estudiante_id,
            valor_numerico: e.valor_numerico,
            observacion: e.observacion
        }));

    if (notasAGuardar.length === 0) {
        this.messageService.add({ severity: 'info', summary: 'Vacío', detail: 'Nada que guardar' });
        return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // Mostrar spinner

    const { error } = await this.supabase.guardarResultadosMasivos(notasAGuardar);
    
    this.loading = false; // Apagar spinner
    
    if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar' });
    } else {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Notas actualizadas' });
        this.displayGradesDialog = false;
        this.cargarDatosIniciales();
    }
    this.cdr.detectChanges(); // <--- Actualización final forzada
  }
}