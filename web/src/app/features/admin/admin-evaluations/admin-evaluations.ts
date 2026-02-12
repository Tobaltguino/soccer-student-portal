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

// Servicios
import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, 
    CheckboxModule, ToggleButtonModule, RadioButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {

  // --- DATOS ---
  sesiones: any[] = [];            // Datos visibles en la tabla (filtrados)
  sesionesOriginales: any[] = [];  // Copia de seguridad de todos los datos
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = [];    // Alumnos a calificar

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: any = null;

  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  // --- ESTADOS UI ---
  loading: boolean = true;
  displayMainDialog: boolean = false;   // Modal Sesión (Logística)
  displayTipoDialog: boolean = false;   // Modal Configuración Tests
  displayGradesDialog: boolean = false; // Modal Calificaciones
  
  usarRangos: boolean = false; // Checkbox para rangos en configuración

  // --- FORMULARIOS ---
  
  // Formulario de Configuración de Test
  tipoForm: any = { nombre: '', unidad_medida: '' };
  rangosForm: any[] = [];
  nuevoRango: any = { 
    nombre_etiqueta: '', 
    valor_min: null, 
    valor_max: null, 
    color_sugerido: '#3b82f6' 
  };

  // Formulario de Sesión (Logística)
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
      // Carga paralela de maestros y datos
      const [g, t, s] = await Promise.all([
        this.supabase.getGrupos(),
        this.supabase.getTiposEvaluacion(),
        this.supabase.getSesionesEvaluacion()
      ]);

      this.grupos = g.data || [];
      this.tiposEvaluacion = t.data || [];
      
      // Guardamos la data cruda en "Originales" y la copia en "sesiones"
      this.sesionesOriginales = s.data || [];
      this.sesiones = [...this.sesionesOriginales];
      
      // Si ya habían filtros seleccionados, los re-aplicamos sobre la nueva data
      this.aplicarFiltros(); 

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error General', detail: 'Fallo de conexión al cargar datos.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // 2. LÓGICA DE FILTRADO (Frontend)
  // ==========================================
  aplicarFiltros() {
    this.sesiones = this.sesionesOriginales.filter(sesion => {
        let cumpleFecha = true;
        let cumpleGrupo = true;
        let cumplePrueba = true;
        let cumpleEstado = true;

        // 1. Filtro Fecha
        if (this.filtroFecha) {
            const fechaFiltroStr = this.formatearFecha(this.filtroFecha);
            // Tomamos los primeros 10 caracteres (YYYY-MM-DD) de la fecha de la sesión
            const fechaSesionStr = (sesion.fecha || '').substring(0, 10); 
            cumpleFecha = fechaSesionStr === fechaFiltroStr;
        }

        // 2. Filtro Grupo (Objeto seleccionado del dropdown)
        if (this.filtroGrupo) {
            cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
        }

        // 3. Filtro Prueba (Objeto seleccionado del dropdown)
        if (this.filtroPrueba) {
            cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
        }

        // 4. Filtro Estado (Valor directo 'PENDIENTE' | 'FINALIZADO')
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
    // Restauramos la lista completa
    this.sesiones = [...this.sesionesOriginales];
  }

  // Auxiliar para convertir Date a 'YYYY-MM-DD' local
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
    this.tipoForm = { nombre: '', unidad_medida: '' };
    this.rangosForm = [];
    this.usarRangos = false;
    this.nuevoRango = { nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#3b82f6' };
    this.displayTipoDialog = true;
  }

  agregarRangoALista() {
    if (!this.nuevoRango.nombre_etiqueta || this.nuevoRango.valor_max === null) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Asigne etiqueta y valor máximo' });
      return;
    }
    this.rangosForm.push({ ...this.nuevoRango });
    // Resetear formulario de rango
    this.nuevoRango = { nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#3b82f6' };
  }

  quitarRangoDeLista(index: number) {
    this.rangosForm.splice(index, 1);
  }

  async guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Nombre y unidad obligatorios' });
      return;
    }

    this.loading = true;
    try {
      // 1. Crear el Tipo de Evaluación
      const { data, error } = await this.supabase.createTipoEvaluacion(this.tipoForm);
      if (error) throw error;

      // 2. Si se activaron rangos, crearlos asociados al ID retornado
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
      message: '¿Eliminar este test y sus escalas? Esto no borrará resultados históricos.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      accept: async () => {
        try {
          // Primero eliminar rangos hijos (si no hay cascade en DB)
          await this.supabase.eliminarRangosPorTipo(id);
          // Luego eliminar el padre
          const { error } = await this.supabase.eliminarTipoEvaluacion(id);
          
          if (error) throw error;
          
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test eliminado' });
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
    this.evalLogistica = { 
      id: null, 
      grupo_id: null, 
      tipo_evaluacion_id: null, 
      fecha: new Date(), 
      estado: 'PENDIENTE' 
    };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    // Convertir string de fecha a objeto Date para el picker
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { ...sesion, fecha: fechaObj };
    this.displayMainDialog = true;
  }

  async crearSesionPlanificada() {
    if (!this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona grupo y prueba' });
        return;
    }

    // Formatear fecha para enviar a Supabase (YYYY-MM-DD)
    const fechaStr = this.evalLogistica.fecha.toISOString().split('T')[0];
    
    const payload = {
        grupo_id: this.evalLogistica.grupo_id,
        tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaStr,
        estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    try {
      let result;
      if (this.evalLogistica.id) {
          // Actualizar
          result = await this.supabase.updateSesionEvaluacion(this.evalLogistica.id, payload);
      } else {
          // Crear
          result = await this.supabase.crearSesionEvaluacion(payload);
      }

      if (result.error) throw result.error;

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      this.cargarDatosIniciales(); // Recargar tabla
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
    this.evalLogistica = { ...sesion }; // Guardar ref de la sesión actual
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Traer alumnos del grupo
      const { data: alumnos } = await this.supabase.getAlumnosPorGrupo(sesion.grupo_id);
      
      // 2. Traer notas ya existentes para esta sesión
      const { data: resultados } = await this.supabase.getResultadosPorSesion(sesion.id);

      // 3. Fusionar datos (Alumno + Nota si existe)
      this.estudiantesGrupo = (alumnos || []).map((alumno: any) => {
          const notaExistente = (resultados as any[])?.find((r: any) => r.estudiante_id === alumno.id);
          return {
              estudiante_id: alumno.id,
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              // Si existe nota, la ponemos, sino null
              valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
      });

      this.displayGradesDialog = true;

    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando listado de alumnos' });
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
    // Filtramos solo los que tienen algún valor para no enviar basura a la BD
    const notasAGuardar = this.estudiantesGrupo
        .filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''))
        .map(e => ({
            sesion_id: this.evalLogistica.id,
            estudiante_id: e.estudiante_id,
            valor_numerico: e.valor_numerico,
            observacion: e.observacion
        }));

    if (notasAGuardar.length === 0) {
        this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
        return;
    }

    this.loading = true;
    try {
      // Upsert masivo (guardar o actualizar)
      const { error } = await this.supabase.guardarResultadosMasivos(notasAGuardar);
      
      if (error) throw error;

      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Resultados actualizados correctamente' });
      this.displayGradesDialog = false;
      this.cargarDatosIniciales(); // Refrescar para actualizar contadores o estados si los hubiera

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar resultados' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}