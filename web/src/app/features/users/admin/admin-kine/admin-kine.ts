import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Módulos de PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
import { DialogModule } from 'primeng/dialog'; 
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag'; // 🔥 AGREGADO PARA LAS ETIQUETAS DE COLOR
import { RadioButtonModule } from 'primeng/radiobutton'; // 🔥 AGREGADO PARA ESTADO DE SESIÓN

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service'; // 🔥 AGREGADO PARA ALUMNOS DE GRUPO

@Component({
  selector: 'app-admin-kine',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    InputNumberModule,
    TableModule,
    SelectModule,
    SelectButtonModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    TagModule,
    RadioButtonModule
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './admin-kine.html',
  styleUrls: ['./admin-kine.css']
})
export class AdminKineComponent implements OnInit {

  seccionActiva: string = 'ficha';
  opcionesMenuAdmin: any[] = [
    { label: 'Ficha Evolutiva', value: 'ficha', icon: 'pi pi-file-edit' },
    { label: 'Lesiones y Ant.', value: 'lesiones', icon: 'pi pi-heart-fill' },
    { label: 'Evaluaciones Físicas', value: 'evaluaciones', icon: 'pi pi-chart-line' }
  ];

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  usuarioActualId: string | null = null;
  listaKinesiologos: any[] = []; 
  
  // ESTADOS FICHA EVOLUTIVA
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;
  editandoId: string | null = null;
  modoSoloLectura: boolean = false;

  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: any[] = this.obtenerArticulacionesVacias();
  listaFuerzas: any[] = [];

  // ESTADOS LESIONES Y ANTECEDENTES
  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;
  mostrarDialogoLesion: boolean = false;
  lesionActual: any = {};
  opcionesTipoLesion: any[] = [
    { label: 'Lesión', value: 'LESION' },
    { label: 'Patología', value: 'PATOLOGIA' },
    { label: 'Alergia', value: 'ALERGIA' }
  ];
  opcionesEstadoLesion: any[] = [
    { label: 'En Observación', value: 'EN_OBSERVACION' },
    { label: 'En Tratamiento', value: 'EN_TRATAMIENTO' },
    { label: 'En Reintegro Deportivo', value: 'EN_REINTEGRO_DEPORTIVO' },
    { label: 'Recuperado', value: 'RECUPERADO' }
  ];

  // 🔥 NUEVOS ESTADOS: EVALUACIONES FÍSICAS (KINE) 🔥
  sesionesEval: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  cargandoEvaluaciones: boolean = false;
  rangos: any[] = [];
  
  filtroFechaEval: Date | null = null;
  filtroPruebaEval: any = null;
  filtroEstadoEval: string | null = null;
  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  displayMainDialogEval: boolean = false;
  evalLogistica: any = {};

  displayGradesDialogEval: boolean = false;
  estudiantesGrupoEval: any[] = [];
  estudianteSeleccionadoEval: any = null;

  displayViewDialogEval: boolean = false;
  sesionVistaEval: any = null;
  resultadosVistaEval: any[] = [];
  estudianteVistaSeleccionadoEval: any = null;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService, 
    private healthService: HealthService,
    private authService: AuthService,
    private academyService: AcademyService, // Inyectado
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    await this.cargarAlumnos(); 
    await this.cargarKinesiologos(); 
    
    // Cargar catálogos base para evaluaciones
    await this.cargarCatalogosEvaluaciones();
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) this.usuarioActualId = user.id; 
    } catch (error) { console.error(error); }
  }

  async cargarAlumnos() {
    try {
      const { data, error }: any = await this.healthService['supabase'].from('estudiantes').select('id, nombre, apellido, rut, grupo_id');
      if (error) throw error;
      if (data) {
        this.listaAlumnos = data.map((a: any) => ({
          ...a, nombreCompleto: `${a.nombre} ${a.apellido} ${a.rut ? '('+a.rut+')' : ''}`
        }));
      }
    } catch (error) { 
      console.error(error); 
    } finally {
      this.cdr.detectChanges(); 
    }
  }

  async cargarKinesiologos() {
    try {
      const { data, error }: any = await this.healthService['supabase'].from('kinesiologos').select('id, nombre, apellido').order('nombre', { ascending: true });
      if (error) throw error;
      if (data) {
        this.listaKinesiologos = data.map((k: any) => ({ id: k.id, nombreCompleto: `${k.nombre} ${k.apellido}` }));
      }
    } catch (error) { 
      console.error(error); 
    } finally {
      this.cdr.detectChanges(); 
    }
  }

  // ==========================================
  // DISPARADOR PRINCIPAL AL CAMBIAR DE ALUMNO
  // ==========================================
  onAlumnoChange() {
    this.volverAlHistorial(); 
    if (this.alumnoSeleccionado) {
      this.cargarHistorialFichas();
      this.cargarListaLesiones(); 
      this.cargarSesionesEvaluacion(); // Cargar evaluaciones del alumno seleccionado
    } else {
      this.historialFichas = [];
      this.listaLesiones = [];
      this.sesionesEval = [];
      this.sesionesFiltradas = [];
      this.cdr.detectChanges(); 
    }
  }

  // =========================================================================
  // MÓDULO: LESIONES Y ANTECEDENTES (HISTORIAL CLÍNICO)
  // =========================================================================

  async cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.healthService.getHistorialClinico(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de lesiones.' });
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges(); 
    }
  }

  abrirNuevaLesion() {
    this.lesionActual = { 
      tipo: 'LESION', 
      estado: 'ACTIVO', 
      fecha_evento: new Date() 
    };
    this.mostrarDialogoLesion = true;
    this.cdr.detectChanges(); 
  }

  abrirEditarLesion(lesion: any) {
    this.lesionActual = { ...lesion };
    
    if (this.lesionActual.fecha_evento) {
      const partes = this.lesionActual.fecha_evento.split('-');
      this.lesionActual.fecha_evento = new Date(partes[0], partes[1] - 1, partes[2]);
    }
    
    this.mostrarDialogoLesion = true;
    this.cdr.detectChanges(); 
  }

  async guardarLesion() {
    try {
      if (!this.lesionActual.tipo || !this.lesionActual.diagnostico || !this.lesionActual.fecha_evento) {
        this.messageService.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Debe completar la fecha, tipo y diagnóstico.' });
        return;
      }

      let fechaFormateada = this.lesionActual.fecha_evento;
      if (this.lesionActual.fecha_evento instanceof Date) {
        const d = this.lesionActual.fecha_evento;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaFormateada = `${year}-${month}-${day}`;
      }

      const payload = {
        ...this.lesionActual,
        estudiante_id: this.alumnoSeleccionado.id,
        fecha_evento: fechaFormateada
      };

      if (payload.id) {
        const { error } = await this.healthService.updateHistorialClinico(payload.id, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado.' });
      } else {
        const { error } = await this.healthService.crearHistorialClinico(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nuevo registro añadido.' });
      }

      this.mostrarDialogoLesion = false;
      this.cargarListaLesiones();

    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar.' });
    }
  }

  confirmarEliminarLesion(lesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar este registro de ${lesion.tipo}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          const { error } = await this.healthService.eliminarHistorialClinico(lesion.id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado exitosamente.' });
          this.cargarListaLesiones(); 
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro.' });
        }
      }
    });
  }

  // =========================================================================
  // MÓDULO: FICHA EVOLUTIVA KINÉSICA
  // =========================================================================

  abrirNuevaFicha() {
    this.resetearFormulario();
    this.editandoId = null;
    this.vistaFormulario = 'antecedentes'; 
    this.modoFormulario = true;
    this.modoSoloLectura = false;
    this.cdr.detectChanges(); 
  }

  volverAlHistorial() {
    this.modoFormulario = false;
    this.editandoId = null;
    this.modoSoloLectura = false;
    this.resetearFormulario();
    this.cdr.detectChanges(); 
  }

  abrirEditarFicha(fichaData: any) {
    this.editandoId = fichaData.id;
    this.vistaFormulario = 'antecedentes';
    this.ficha = { ...fichaData };

    if (fichaData.rango_movimiento) {
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n');
        const romGuardado = fichaData.rango_movimiento[clave];
        if (romGuardado) {
          art.der_activo = romGuardado.der_activo;
          art.der_pasivo = romGuardado.der_pasivo;
          art.izq_activo = romGuardado.izq_activo;
          art.izq_pasivo = romGuardado.izq_pasivo;
        }
      });
    }

    this.listaFuerzas = fichaData.fuerza_movimientos ? [...fichaData.fuerza_movimientos] : [];
    this.modoFormulario = true;
    this.modoSoloLectura = false;
    this.cdr.detectChanges(); 
  }

  abrirVerFicha(fichaData: any) {
    this.abrirEditarFicha(fichaData); 
    this.modoSoloLectura = true;      
    this.cdr.detectChanges(); 
  }

  async cargarHistorialFichas() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.healthService.getFichasPorEstudiante(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.historialFichas = data || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges(); 
    }
  }

  async guardarFicha() {
    try {
      if (!this.ficha.kinesiologo_id) {
        this.messageService.add({ severity: 'warn', summary: 'Falta Kinesiólogo', detail: 'Debe asignar a un Profesional Tratante.' });
        return;
      }
      const romObject: any = {};
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n'); 
        romObject[clave] = {
          der_activo: art.der_activo, der_pasivo: art.der_pasivo, izq_activo: art.izq_activo, izq_pasivo: art.izq_pasivo
        };
      });

      const payload: any = {
        ...this.ficha,
        estudiante_id: this.alumnoSeleccionado.id,
        rango_movimiento: romObject,
        fuerza_movimientos: this.listaFuerzas,
        balance_romberg: this.ficha.balance_romberg === '' ? null : this.ficha.balance_romberg
      };

      if (!this.editandoId) payload.kinesiologo_id = this.ficha.kinesiologo_id; 
      delete payload.kinesiologos; 

      if (this.editandoId) {
        const { error } = await this.healthService.updateFichaEvolutiva(this.editandoId, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Ficha actualizada correctamente.' });
      } else {
        const { error } = await this.healthService.crearFichaEvolutiva(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nueva ficha registrada.' });
      }
      
      this.volverAlHistorial();
      this.cargarHistorialFichas();

    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' });
    }
  }

  confirmarEliminacion(ficha: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar permanentemente la ficha del ${new Date(ficha.fecha_creacion).toLocaleDateString('es-CL')}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          const { error } = await this.healthService.eliminarFichaEvolutiva(ficha.id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'La ficha fue eliminada exitosamente.' });
          this.cargarHistorialFichas(); 
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la ficha.' });
        }
      }
    });
  }

  agregarFuerza() { 
    this.listaFuerzas.push({ movimiento: '', escala: '' }); 
    this.cdr.detectChanges(); 
  }
  eliminarFuerza(index: number) { 
    this.listaFuerzas.splice(index, 1); 
    this.cdr.detectChanges(); 
  }
  resetearFormulario() { 
    this.ficha = this.obtenerFichaVacia(); 
    this.listaArticulaciones = this.obtenerArticulacionesVacias(); 
    this.listaFuerzas = []; 
  }

  obtenerFichaVacia() {
    return {
      kinesiologo_id: null, rom_no_evaluable: false, fuerza_no_evaluable: false, balance_no_evaluable: false,
      inspeccion_mov_sin_compensacion: false, inspeccion_mov_con_compensacion: false, inspeccion_no_logra_mov: false,
      coord_dedo_nariz: false, coord_pinza_pulgar_indice: false, coord_talon_rodilla: false, balance_romberg: null
    };
  }

  obtenerArticulacionesVacias() {
    return [
      { nombre: 'Hombro', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Codo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Muñeca', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Dedos', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Cadera', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Rodilla', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Tobillo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Ortejo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null }
    ];
  }

  // =========================================================================
  // MÓDULO: EVALUACIONES FÍSICAS (KINE) 🔥🔥🔥
  // =========================================================================

  async cargarCatalogosEvaluaciones() {
    try {
      const resTipos = await this.healthService.getTiposEvaluacionKine();
      if (resTipos.data) this.tiposEvaluacion = resTipos.data;

      const resRangos = await this.healthService.getRangosEvaluacion();
      if (resRangos.data) this.rangos = resRangos.data;

      const resGrupos = await this.academyService.getGrupos();
      if (resGrupos.data) this.grupos = resGrupos.data;
      
    } catch (error) {
      console.error('Error catálogos evaluaciones:', error);
    }
  }

  getSeverityPuntaje(puntaje: number | string | null, subevaluacionId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    if (puntaje === null || puntaje === undefined || puntaje === '') return 'secondary';
    const puntajeNum = Number(puntaje);
    const rango = this.rangos.find(r => r.puntaje === puntajeNum && r.subevaluacion_id === subevaluacionId);
    
    switch (rango?.color) {
      case 'rojo': return 'danger';
      case 'amarillo': return 'warn';
      case 'verde': return 'success';
      default: return 'info';
    }
  }

  async cargarSesionesEvaluacion() {
    if (!this.alumnoSeleccionado) return;
    this.cargandoEvaluaciones = true;
    this.cdr.detectChanges();

    try {
      // Como administrador, cargamos las sesiones correspondientes al grupo del alumno
      const grupoId = this.alumnoSeleccionado.grupo_id;
      if (!grupoId) {
        this.sesionesEval = [];
        this.aplicarFiltrosEval();
        return;
      }

      const { data, error } = await this.healthService['supabase']
        .from('evaluaciones_sesiones_kine')
        .select('*, tipo_evaluacion:tipo_evaluacion_id(nombre)')
        .eq('grupo_id', grupoId)
        .order('fecha', { ascending: false });
      
      if (error) throw error;

      if (data) {
        this.sesionesEval = data.map((s: any) => ({
            ...s,
            grupos: this.grupos.find(g => g.id === s.grupo_id) || { nombre: 'Desconocido' },
            tipo_evaluacion: s.tipo_evaluacion || this.tiposEvaluacion.find(t => t.id === s.tipo_evaluacion_id) || { nombre: 'Desconocido' }
        }));
        this.aplicarFiltrosEval();
      }
    } catch (error) {
      this.mostrarError('Error al cargar las sesiones de evaluación.');
    } finally {
      this.cargandoEvaluaciones = false;
      this.cdr.detectChanges(); 
    }
  }

  aplicarFiltrosEval() {
    this.sesionesFiltradas = this.sesionesEval.filter(sesion => {
      let cumpleFecha = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      if (this.filtroFechaEval) {
        const fechaFiltroStr = this.formatearFechaIso(this.filtroFechaEval);
        cumpleFecha = sesion.fecha === fechaFiltroStr;
      }
      if (this.filtroPruebaEval) {
        cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPruebaEval.id;
      }
      if (this.filtroEstadoEval) {
        cumpleEstado = sesion.estado === this.filtroEstadoEval;
      }

      return cumpleFecha && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltrosEval() {
    this.filtroFechaEval = null;
    this.filtroPruebaEval = null;
    this.filtroEstadoEval = null;
    this.aplicarFiltrosEval();
  }

  abrirNuevaSesionEval() {
    this.evalLogistica = { 
      estado: 'PENDIENTE',
      grupo_id: this.alumnoSeleccionado.grupo_id // Preseleccionamos el grupo del alumno actual
    };
    this.displayMainDialogEval = true;
  }

  editarSesionEval(sesion: any) {
    this.evalLogistica = { 
      ...sesion,
      fecha: this.convertirStringADate(sesion.fecha)
    };
    this.displayMainDialogEval = true;
  }

  async guardarSesionLogisticaEval() {
    if (!this.evalLogistica.fecha) return this.mostrarAdvertencia('Selecciona una fecha.');
    if (!this.evalLogistica.grupo_id) return this.mostrarAdvertencia('Selecciona un grupo.');
    if (!this.evalLogistica.tipo_evaluacion_id) return this.mostrarAdvertencia('Selecciona el tipo de prueba.');

    const payload = {
      fecha: this.formatearFechaIso(this.evalLogistica.fecha),
      grupo_id: this.evalLogistica.grupo_id,
      tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id, 
      estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    try {
      if (this.evalLogistica.id) {
        const { error } = await this.healthService.actualizarEvaluacionKine(this.evalLogistica.id, payload);
        if (error) throw error;
        this.mostrarExito('Sesión actualizada correctamente.');
      } else {
        const { error } = await this.healthService.crearEvaluacionKine(payload);
        if (error) throw error;
        this.mostrarExito('Sesión creada correctamente.');
      }
      
      this.displayMainDialogEval = false;
      await this.cargarSesionesEvaluacion();
    } catch (error: any) {
      this.mostrarError(error.message || 'Ocurrió un error al guardar la sesión.');
    }
  }

  confirmarEliminarSesionEval(sesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar permanentemente la sesión de evaluación del ${new Date(sesion.fecha).toLocaleDateString('es-CL')}? Esto borrará todas las notas de todos los alumnos de ese grupo.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          // Nota: Asegúrate de que en Supabase 'evaluaciones_resultados_kine' tenga ON DELETE CASCADE 
          // asociado a 'sesion_id', para que al borrar la sesión se borren las notas.
          const { error } = await this.healthService.eliminarEvaluacionKine(sesion.id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'La sesión fue eliminada exitosamente.' });
          this.cargarSesionesEvaluacion(); 
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la sesión. Puede que tenga resultados asociados.' });
        }
      }
    });
  }

  // --- CALIFICADOR ---
  verificarSiEstaEvaluado(evaluaciones: any[]): boolean {
    if (!evaluaciones || evaluaciones.length === 0) return false;
    return evaluaciones.every(sub => {
      const evaluaLados = sub.evalua_lados === true || sub.evalua_lados === 'true';
      if (evaluaLados) {
        return sub.resultado_izquierdo !== null && sub.resultado_izquierdo !== undefined && sub.resultado_izquierdo !== '' &&
               sub.resultado_derecho !== null && sub.resultado_derecho !== undefined && sub.resultado_derecho !== '';
      } else {
        return sub.resultado_unico !== null && sub.resultado_unico !== undefined && sub.resultado_unico !== '';
      }
    });
  }

  actualizarEstadoEstudianteEval() {
    setTimeout(() => {
      if (this.estudianteSeleccionadoEval) {
        this.estudianteSeleccionadoEval.evaluado = this.verificarSiEstaEvaluado(this.estudianteSeleccionadoEval.evaluaciones);
      }
    }, 50);
  }

  limpiarFilaEval(sub: any) {
    sub.resultado_unico = null;
    sub.resultado_izquierdo = null;
    sub.resultado_derecho = null;
    sub.observacion = '';
    this.actualizarEstadoEstudianteEval();
  }

  async abrirCalificadorEval(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.cargandoEvaluaciones = true;
    this.cdr.detectChanges();

    try {
      const { data: alumnos, error: errAlumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      if (errAlumnos) throw errAlumnos;

      const { data: subevaluaciones, error: errSub } = await this.healthService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      if (errSub) throw errSub;

      const { data: resultadosPrevios, error: errRes } = await this.healthService.getResultadosPorSesionKine(sesion.id);
      if (errRes) throw errRes;
      
      this.estudiantesGrupoEval = (alumnos || []).map(alumno => {
        const evaluacionesDelAlumno = (subevaluaciones || []).map((sub: any) => {
          const resGuardado = resultadosPrevios?.find((r: any) => 
            r.estudiante_id === alumno.id && r.subevaluacion_id === sub.id
          );

          return {
            subevaluacion_id: sub.id,
            nombre_parametro: sub.nombre,
            evalua_lados: sub.evalua_lados,
            resultado_unico: (resGuardado && resGuardado.resultado_unico != null) ? Number(resGuardado.resultado_unico) : null,
            resultado_izquierdo: (resGuardado && resGuardado.resultado_izquierdo != null) ? Number(resGuardado.resultado_izquierdo) : null,
            resultado_derecho: (resGuardado && resGuardado.resultado_derecho != null) ? Number(resGuardado.resultado_derecho) : null,
            observacion: resGuardado ? resGuardado.observacion : ''
          };
        });

        const tieneEvaluacion = this.verificarSiEstaEvaluado(evaluacionesDelAlumno);

        return {
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          evaluado: tieneEvaluacion,
          evaluaciones: evaluacionesDelAlumno
        };
      });

      // Seleccionar al alumno activo en el buscador si está en este grupo
      if (this.estudiantesGrupoEval.length > 0) {
        const indexActual = this.estudiantesGrupoEval.findIndex(e => e.id === this.alumnoSeleccionado.id);
        this.estudianteSeleccionadoEval = indexActual !== -1 ? this.estudiantesGrupoEval[indexActual] : this.estudiantesGrupoEval[0];
      } else {
        this.estudianteSeleccionadoEval = null;
      }

      this.displayGradesDialogEval = true;
    } catch (error: any) {
      this.mostrarError(error.message || 'Error al cargar la planilla.');
    } finally {
      this.cargandoEvaluaciones = false;
      this.cdr.detectChanges();
    }
  }

  async guardarNotasFinalesEval() {
    const registrosAGuardar: any[] = [];

    this.estudiantesGrupoEval.forEach(estudiante => {
      estudiante.evaluaciones.forEach((sub: any) => {
        if (
          sub.resultado_unico !== null || 
          sub.resultado_izquierdo !== null || 
          sub.resultado_derecho !== null || 
          (sub.observacion && sub.observacion.trim() !== '')
        ) {
          registrosAGuardar.push({
            sesion_id: this.evalLogistica.id,
            estudiante_id: estudiante.id,
            subevaluacion_id: sub.subevaluacion_id,
            resultado_unico: sub.resultado_unico !== null ? String(sub.resultado_unico) : null,
            resultado_izquierdo: sub.resultado_izquierdo !== null ? String(sub.resultado_izquierdo) : null,
            resultado_derecho: sub.resultado_derecho !== null ? String(sub.resultado_derecho) : null,
            observacion: sub.observacion
          });
        }
      });
    });

    if (registrosAGuardar.length === 0) {
      this.mostrarAdvertencia('No has ingresado ningún dato para guardar.');
      return;
    }

    try {
      const { error } = await this.healthService.guardarResultadoKine(registrosAGuardar);
      if (error) throw error; 
      
      if (this.evalLogistica.estado === 'PENDIENTE') {
        this.confirmationService.confirm({
          message: '¿Deseas marcar esta sesión como FINALIZADA?',
          header: 'Sesión Completada',
          icon: 'pi pi-check-circle',
          acceptLabel: 'Sí, finalizar',
          rejectLabel: 'No, dejar pendiente',
          accept: async () => {
              const { error: errUpdate } = await this.healthService.actualizarEvaluacionKine(this.evalLogistica.id, { estado: 'FINALIZADO' });
              if (errUpdate) throw errUpdate;

              this.mostrarExito('Resultados guardados y sesión finalizada.');
              this.displayGradesDialogEval = false;
              this.cargarSesionesEvaluacion();
          },
          reject: () => {
              this.mostrarExito('Resultados guardados correctamente.');
              this.displayGradesDialogEval = false;
          }
        });
      } else {
        this.mostrarExito('Resultados guardados correctamente.');
        this.displayGradesDialogEval = false;
      }
    } catch (error: any) {
      console.error("Error al guardar evaluación:", error);
      this.mostrarError(error.message || 'Error al guardar los resultados. Verifica la regla UNIQUE en BD.');
    }
  }

  async verResultadosEval(sesion: any) {
    this.sesionVistaEval = { ...sesion };
    this.cargandoEvaluaciones = true;
    this.cdr.detectChanges();

    try {
      const { data: alumnos, error: errAlumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      if (errAlumnos) throw errAlumnos;

      const { data: subevaluaciones } = await this.healthService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      const subevaluacionesDefinidas = subevaluaciones || [];
      
      const { data: resultadosPrevios } = await this.healthService.getResultadosPorSesionKine(sesion.id);

      this.resultadosVistaEval = (alumnos || []).map(alumno => {
        const evaluacionesDelAlumno = subevaluacionesDefinidas.map((sub: any) => {
          const resGuardado = resultadosPrevios?.find((r: any) => 
            r.estudiante_id === alumno.id && r.subevaluacion_id === sub.id
          );
          return {
            subevaluacion_id: sub.id, 
            nombre_parametro: sub.nombre,
            resultado_unico: resGuardado?.resultado_unico != null ? Number(resGuardado.resultado_unico) : null,
            resultado_izquierdo: resGuardado?.resultado_izquierdo != null ? Number(resGuardado.resultado_izquierdo) : null,
            resultado_derecho: resGuardado?.resultado_derecho != null ? Number(resGuardado.resultado_derecho) : null,
            observacion: resGuardado ? resGuardado.observacion : '',
            tiene_datos: !!resGuardado 
          };
        }).filter(e => e.tiene_datos); 

        return {
          id: alumno.id, 
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          evaluaciones: evaluacionesDelAlumno
        };
      }).filter(a => a.evaluaciones.length > 0); 

      if (this.resultadosVistaEval.length > 0) {
        const indexActual = this.resultadosVistaEval.findIndex(e => e.id === this.alumnoSeleccionado.id);
        this.estudianteVistaSeleccionadoEval = indexActual !== -1 ? this.resultadosVistaEval[indexActual] : this.resultadosVistaEval[0];
      } else {
        this.estudianteVistaSeleccionadoEval = null;
      }

      this.displayViewDialogEval = true;
    } catch (error: any) {
      this.mostrarError(error.message || 'Error al cargar los resultados.');
    } finally {
      this.cargandoEvaluaciones = false;
      this.cdr.detectChanges();
    }
  }

  // --- UTILIDADES ---
  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
    return localISOTime;
  }
  private convertirStringADate(fechaStr: string): Date | null {
    if (!fechaStr) return null;
    const [year, month, day] = fechaStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  private mostrarExito(mensaje: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje }); }
  private mostrarError(mensaje: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje }); }
  private mostrarAdvertencia(mensaje: string) { this.messageService.add({ severity: 'warn', summary: 'Atención', detail: mensaje }); }
}