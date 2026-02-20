import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';

import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, 
    CheckboxModule, ToggleButtonModule, RadioButtonModule, TextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {

  // --- DATOS ---
  sesiones: any[] = [];            
  sesionesOriginales: any[] = [];  
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = [];    

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: any = null;

  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  opcionesColor = [
    { label: 'Azul', value: '#3b82f6', hex: '#3b82f6' },
    { label: 'Verde', value: '#22c55e', hex: '#22c55e' },
    { label: 'Amarillo', value: '#eab308', hex: '#eab308' },
    { label: 'Naranja', value: '#f97316', hex: '#f97316' },
    { label: 'Rojo', value: '#ef4444', hex: '#ef4444' },
    { label: 'Gris', value: '#6b7280', hex: '#6b7280' }
  ];

  // --- ESTADOS UI ---
  loading: boolean = true;
  displayMainDialog: boolean = false;   
  displayTipoDialog: boolean = false;   
  displayGradesDialog: boolean = false; 
  
  usarRangos: boolean = false;

  // --- FORMULARIOS ---
  tipoForm: any = { nombre: '', unidad_medida: '', descripcion: '' };
  rangosForm: any[] = [];
  
  // Rango con Edad y color verde por defecto
  nuevoRango: any = { 
    edad_min: null,   // ✅ NUEVO
    edad_max: null,   // ✅ NUEVO
    nombre_etiqueta: '', 
    valor_min: null, 
    valor_max: null, 
    color_sugerido: '#22c55e' 
  };

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS INICIAL
  // ==========================================
  async cargarDatosIniciales() {
    this.loading = true;
    try {
      const [g, t, s] = await Promise.all([
        this.supabase.getGrupos(),
        this.supabase.getTiposEvaluacion(),
        this.supabase.getSesionesEvaluacion()
      ]);

      this.grupos = g.data || [];
      this.tiposEvaluacion = t.data || [];
      this.sesionesOriginales = s.data || [];
      this.sesiones = [...this.sesionesOriginales];
      this.aplicarFiltros(); 

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error General', detail: 'Fallo de conexión al cargar datos.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // 2. LÓGICA DE FILTRADO
  // ==========================================
  aplicarFiltros() {
    this.sesiones = this.sesionesOriginales.filter(sesion => {
        let cumpleFecha = true;
        let cumpleGrupo = true;
        let cumplePrueba = true;
        let cumpleEstado = true;

        if (this.filtroFecha) {
            const fechaFiltroStr = this.formatearFecha(this.filtroFecha);
            const fechaSesionStr = (sesion.fecha || '').substring(0, 10); 
            cumpleFecha = fechaSesionStr === fechaFiltroStr;
        }
        if (this.filtroGrupo) {
            cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
        }
        if (this.filtroPrueba) {
            cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
        }
        if (this.filtroEstado) {
            cumpleEstado = sesion.estado === this.filtroEstado;
        }

        return cumpleFecha && cumpleGrupo && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.sesiones = [...this.sesionesOriginales];
  }

  formatearFecha(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  }

  // ==========================================
  // 3. GESTIÓN DE TIPOS DE EVALUACIÓN Y RANGOS
  // ==========================================
  
  abrirNuevoTipo() {
    this.tipoForm = { nombre: '', unidad_medida: '', descripcion: '' };
    this.rangosForm = [];
    this.usarRangos = false;
    this.nuevoRango = { edad_min: null, edad_max: null, nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#22c55e' };
    this.displayTipoDialog = true;
  }

  agregarRangoALista() {
    if (this.nuevoRango.edad_min === null || this.nuevoRango.edad_max === null || !this.nuevoRango.nombre_etiqueta || this.nuevoRango.valor_min === null || this.nuevoRango.valor_max === null) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Llene todos los campos del rango (*)' });
      return;
    }

    if (this.nuevoRango.edad_min > this.nuevoRango.edad_max) {
      this.messageService.add({ severity: 'warn', summary: 'Edad Inválida', detail: 'La edad mínima no puede ser mayor a la máxima' });
      return;
    }
    
    // Cambiamos >= a > por si el valor min y max son exactos (Ej: min 10, max 10)
    if (this.nuevoRango.valor_min > this.nuevoRango.valor_max) {
      this.messageService.add({ severity: 'warn', summary: 'Valor Inválido', detail: 'El valor mínimo no puede ser mayor al máximo' });
      return;
    }

    const eMinNuevo = this.nuevoRango.edad_min;
    const eMaxNuevo = this.nuevoRango.edad_max;
    const vMinNuevo = this.nuevoRango.valor_min;
    const vMaxNuevo = this.nuevoRango.valor_max;
    const etiquetaNueva = this.nuevoRango.nombre_etiqueta.trim().toUpperCase();

    // Validar cruce de datos
    const conflicto = this.rangosForm.find(r => {
      const solapanEdades = (eMinNuevo <= r.edad_max) && (eMaxNuevo >= r.edad_min);
      const solapanValores = (vMinNuevo <= r.valor_max) && (vMaxNuevo >= r.valor_min);
      const mismaEtiqueta = (r.nombre_etiqueta.trim().toUpperCase() === etiquetaNueva);

      return (solapanEdades && solapanValores) || (solapanEdades && mismaEtiqueta);
    });

    if (conflicto) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Cruce de Datos Detectado', 
        detail: `No se puede agregar. Los valores (${vMinNuevo}-${vMaxNuevo}) chocan con el rango '${conflicto.nombre_etiqueta}' (${conflicto.valor_min}-${conflicto.valor_max}) para alumnos de ${conflicto.edad_min} a ${conflicto.edad_max} años.` 
      });
      return;
    }

    this.rangosForm.push({ ...this.nuevoRango });
    
    this.nuevoRango = { 
        edad_min: this.nuevoRango.edad_min, 
        edad_max: this.nuevoRango.edad_max, 
        nombre_etiqueta: '', 
        valor_min: null, 
        valor_max: null, 
        color_sugerido: this.nuevoRango.color_sugerido 
    };
  }

  quitarRangoDeLista(index: number) {
    this.rangosForm.splice(index, 1);
  }

  async guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El Nombre y la Unidad son obligatorios (*)' });
      return;
    }
    // ... el resto de la función guardarNuevoTipo() se mantiene igual ...
    this.loading = true;
    try {
      const { data, error } = await this.supabase.createTipoEvaluacion(this.tipoForm);
      if (error) throw error;

      if (this.usarRangos && data && Array.isArray(data) && data.length > 0 && this.rangosForm.length > 0) {
        const testId = (data as any[])[0].id;
        const rangosParaDB = this.rangosForm.map(r => ({
          ...r,
          tipo_evaluacion_id: testId
        }));
        const { error: errorRangos } = await this.supabase.createRango(rangosParaDB);
        if (errorRangos) throw errorRangos;
      }

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test configurado correctamente' });
      this.displayTipoDialog = false;
      this.cargarDatosIniciales(); 

    } catch (err: any) {
      console.error(err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message || 'Error al guardar' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este test?\n\n⚠️ IMPORTANTE: Se eliminarán todas las sesiones planificadas y TODOS LOS RESULTADOS históricos de los alumnos asociados a esta prueba.\n\nEsta acción no se puede deshacer.',
      header: 'Confirmar Eliminación Crítica',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar todo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger', 
      accept: async () => {
        try {
          await this.supabase.eliminarRangosPorTipo(id);
          const { error } = await this.supabase.eliminarTipoEvaluacion(id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test y datos asociados eliminados' });
          this.cargarDatosIniciales();
        } catch (err: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el test.' });
        }
      }
    });
  }

  // ==========================================
  // 4. GESTIÓN DE SESIONES (CRUD LOGÍSTICA)
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

  async crearSesionPlanificada() {
    // 1. Validar campos obligatorios
    if (!this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id || !this.evalLogistica.fecha) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios marcados con (*)' });
        return;
    }

    // 2. Validar formato de fecha
    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ severity: 'warn', summary: 'Fecha Inválida', detail: 'Ingrese una fecha válida para la sesión.' });
        return;
    }

    const fechaStr = fechaSeleccionada.toISOString().split('T')[0];
    const payload = {
        grupo_id: this.evalLogistica.grupo_id,
        tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaStr,
        estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    try {
      let result;
      if (this.evalLogistica.id) {
          result = await this.supabase.updateSesionEvaluacion(this.evalLogistica.id, payload);
      } else {
          result = await this.supabase.crearSesionEvaluacion(payload);
      }

      if (result.error) throw result.error;

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  async eliminarSesion(id: string) {
      this.confirmationService.confirm({
          message: '¿Eliminar sesión y todas sus notas asociadas?',
          header: 'Confirmar Eliminación',
          icon: 'pi pi-trash',
          acceptLabel: 'Eliminar',
          acceptButtonStyleClass: 'p-button-danger p-button-text',
          accept: async () => {
              const { error } = await this.supabase.eliminarSesionEvaluacion(id);
              if (error) throw error;
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sesión borrada' });
              this.cargarDatosIniciales();
          }
      });
  }

  // ==========================================
  // 5. CALIFICACIÓN DE ESTUDIANTES
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const [resAlumnos, resResultados] = await Promise.all([
         this.supabase.getAlumnosPorGrupo(sesion.grupo_id),
         this.supabase.getResultadosPorSesion(sesion.id)
      ]);

      if (resAlumnos.error) console.error("Error cargando alumnos:", resAlumnos.error);
      if (resResultados.error) console.error("Error cargando notas:", resResultados.error);

      const alumnos = resAlumnos.data || [];
      const resultados = resResultados.data || [];

      this.estudiantesGrupo = alumnos.map((alumno: any) => {
          const notaExistente = resultados.find((r: any) => r.estudiante_id === alumno.id);
          
          return {
              estudiante_id: alumno.id,
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
      });
      
      this.displayGradesDialog = true;

    } catch (e: any) {
      console.error("Error CRÍTICO en abrirCalificador:", e);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se pudo cargar la lista de estudiantes. Intente nuevamente.' 
      });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
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
        observacion: e.observacion || ''
      }));

    if (notasAGuardar.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
      return;
    }

    this.loading = true;
    try {
      const { error } = await this.supabase.guardarResultadosMasivos(notasAGuardar);
      if (error) throw error; 

      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Resultados actualizados correctamente' });
      this.displayGradesDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      console.error("Error al guardar:", error); 
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar: posible duplicado o error de conexión.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}