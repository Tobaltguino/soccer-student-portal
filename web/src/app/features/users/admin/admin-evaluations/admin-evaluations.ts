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

// Servicios
import { AcademyService } from '../../../../core/services/academy.service';
import { HealthService } from '../../../../core/services/health.service';

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
  todosLosRangos: any[] = [];      
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
  displayViewDialog: boolean = false; 
  usarRangos: boolean = false;

  resultadosVista: any[] = []; 
  sesionVista: any = null;     

  // --- FORMULARIOS ---
  tipoForm: any = { id: null, nombre: '', unidad_medida: '', descripcion: '' }; 
  rangosForm: any[] = [];
  
  nuevoRango: any = { 
    edad_min: null,   
    edad_max: null,   
    nombre_etiqueta: '', 
    valor_min: null, 
    valor_max: null, 
    color_sugerido: '#22c55e' 
  };

  evalLogistica: any = {
    id: null, grupo_id: null, tipo_evaluacion_id: null, fecha: new Date(), estado: 'PENDIENTE'
  };

  constructor(
    private academyService: AcademyService,
    private healthService: HealthService,
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
      const [g, t, s, r] = await Promise.all([
        this.academyService.getGrupos(),
        this.healthService.getTiposEvaluacion(),
        this.healthService.getSesionesEvaluacion(),
        this.healthService.getAllRangos() 
      ]);

      this.grupos = g.data || [];
      this.tiposEvaluacion = t.data || [];
      this.sesionesOriginales = s.data || [];
      this.todosLosRangos = r.data || []; 
      
      this.sesiones = [...this.sesionesOriginales];
      this.aplicarFiltros(); 

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al conectar con el servidor.' });
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
        let f = true, g = true, p = true, e = true;

        if (this.filtroFecha) {
            f = (sesion.fecha || '').substring(0, 10) === this.formatearFecha(this.filtroFecha);
        }
        if (this.filtroGrupo) {
            g = sesion.grupo_id === this.filtroGrupo.id;
        }
        if (this.filtroPrueba) {
            p = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
        }
        if (this.filtroEstado) {
            e = sesion.estado === this.filtroEstado;
        }

        return f && g && p && e;
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
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
  }

  // ==========================================
  // 3. GESTIÓN DE TIPOS DE EVALUACIÓN Y RANGOS
  // ==========================================
  abrirNuevoTipo() {
    this.cancelarEdicionTipo(); 
    this.displayTipoDialog = true;
  }

  cancelarEdicionTipo() {
    this.tipoForm = { id: null, nombre: '', unidad_medida: '', descripcion: '' };
    this.rangosForm = [];
    this.usarRangos = false;
    this.nuevoRango = { edad_min: null, edad_max: null, nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#22c55e' };
  }

  editarTipoTest(test: any) {
    this.tipoForm = { ...test }; 
    this.rangosForm = this.todosLosRangos
      .filter(r => r.tipo_evaluacion_id === test.id)
      .sort((a, b) => a.edad_min - b.edad_min || a.valor_min - b.valor_min); 

    this.usarRangos = this.rangosForm.length > 0;
    this.cdr.detectChanges(); 
  }

  agregarRangoALista() {
    if (this.nuevoRango.edad_min === null || this.nuevoRango.edad_max === null || !this.nuevoRango.nombre_etiqueta || this.nuevoRango.valor_min === null || this.nuevoRango.valor_max === null) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Llene todos los campos.' });
      return;
    }

    const conflicto = this.rangosForm.find(r => {
      const solapanEdades = (this.nuevoRango.edad_min <= r.edad_max) && (this.nuevoRango.edad_max >= r.edad_min);
      const solapanValores = (this.nuevoRango.valor_min <= r.valor_max) && (this.nuevoRango.valor_max >= r.valor_min);
      const mismaEtiqueta = (r.nombre_etiqueta.trim().toUpperCase() === this.nuevoRango.nombre_etiqueta.trim().toUpperCase());
      return (solapanEdades && solapanValores) || (solapanEdades && mismaEtiqueta);
    });

    if (conflicto) {
      this.messageService.add({ severity: 'error', summary: 'Cruce detectado', detail: `Choca con el rango '${conflicto.nombre_etiqueta}'.` });
      return;
    }

    this.rangosForm.push({ ...this.nuevoRango });
    this.nuevoRango = { ...this.nuevoRango, nombre_etiqueta: '', valor_min: null, valor_max: null };
  }

  quitarRangoDeLista(index: number) {
    this.rangosForm.splice(index, 1);
  }

  async guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Nombre y Unidad son obligatorios.' });
      return;
    }
    
    this.loading = true;
    try {
      let testId = this.tipoForm.id;
      const payload = { nombre: this.tipoForm.nombre, unidad_medida: this.tipoForm.unidad_medida, descripcion: this.tipoForm.descripcion };

      if (testId) {
        await this.healthService.updateTipoEvaluacion(testId, payload);
        await this.healthService.eliminarRangosPorTipo(testId); 
      } else {
        const { data } = await this.healthService.createTipoEvaluacion(payload);
        testId = (data as any[])[0].id;
      }

      if (this.usarRangos && this.rangosForm.length > 0) {
        const rangosParaDB = this.rangosForm.map(r => ({ ...r, tipo_evaluacion_id: testId }));
        await this.healthService.createRango(rangosParaDB);
      }

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test guardado.' });
      this.cancelarEdicionTipo(); 
      this.cargarDatosIniciales(); 

    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el test.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro? Se borrarán todos los resultados históricos de este test.',
      header: 'Eliminación Crítica',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar todo',
      acceptButtonStyleClass: 'p-button-danger', 
      accept: async () => {
        try {
          await this.healthService.eliminarRangosPorTipo(id);
          await this.healthService.eliminarTipoEvaluacion(id);
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Datos eliminados.' });
          this.cargarDatosIniciales();
        } catch (err: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar.' });
        }
      }
    });
  }

  // ==========================================
  // 4. GESTIÓN DE SESIONES
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
    if (!this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id || !this.evalLogistica.fecha) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete los campos obligatorios (*)' });
        return;
    }

    const payload = {
        grupo_id: this.evalLogistica.grupo_id,
        tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
        fecha: this.formatearFecha(this.evalLogistica.fecha),
        estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    try {
      if (this.evalLogistica.id) await this.healthService.updateSesionEvaluacion(this.evalLogistica.id, payload);
      else await this.healthService.crearSesionEvaluacion(payload);

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar la sesión.' });
    }
  }

  async eliminarSesion(id: string) {
      this.confirmationService.confirm({
          message: '¿Eliminar sesión y todas sus notas?',
          header: 'Confirmar Eliminación',
          icon: 'pi pi-trash',
          acceptButtonStyleClass: 'p-button-danger p-button-text',
          accept: async () => {
              await this.healthService.eliminarSesionEvaluacion(id);
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sesión borrada' });
              this.cargarDatosIniciales();
          }
      });
  }

  // ==========================================
  // 5. CALIFICACIÓN (PLANILLA)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const { data: alumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      
      this.estudiantesGrupo = await this.healthService.prepararPlanillaCalificaciones(
        sesion.grupo_id, 
        sesion.id, 
        alumnos || []
      );
      
      this.displayGradesDialog = true;
    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la planilla.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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

    if (notasAGuardar.length === 0) return;

    this.loading = true;
    try {
      await this.healthService.guardarResultadosMasivos(notasAGuardar);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Resultados guardados.' });
      this.displayGradesDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar resultados.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  limpiarFila(estudiante: any) {
    estudiante.valor_numerico = null;
    estudiante.observacion = '';
  }

  // ==========================================
  // 6. VISTA DE RESULTADOS (OJO)
  // ==========================================
  async verResultados(sesion: any) {
      this.sesionVista = { ...sesion };
      this.loading = true;
      this.cdr.detectChanges();

      try {
          // 1. Traemos la lista completa de alumnos (AQUÍ VIENE LA FECHA DE NACIMIENTO GRACIAS AL SERVICIO ACTUALIZADO)
          const { data: alumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
          
          // 2. Traemos las notas
          const resultadosBrutos = await this.healthService.prepararPlanillaCalificaciones(
              sesion.grupo_id, 
              sesion.id, 
              alumnos || []
          );

          // 3. Cruzamos los datos
          this.resultadosVista = resultadosBrutos
              .filter((e: any) => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''))
              .map((e: any) => {
                  // Buscamos al alumno original en la lista descargada para sacar su fecha de nacimiento real (Tipado a any para evitar error)
                  const alumnoData: any = (alumnos || []).find((a: any) => a.id === e.estudiante_id);
                  const fechaNac = alumnoData ? alumnoData.fecha_nacimiento : null;

                  // Calculamos con la fecha segura
                  const edad = this.calcularEdadParaTest(fechaNac, sesion.fecha);
                  const rango = this.obtenerRangoParaNota(e.valor_numerico, edad, sesion.tipo_evaluacion_id);

                  return {
                      ...e,
                      etiqueta: rango ? rango.nombre_etiqueta : 'Registrado',
                      color: rango ? rango.color_sugerido : '#6b7280'
                  };
              });

          this.displayViewDialog = true;
      } catch (e: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los resultados.' });
      } finally {
          this.loading = false;
          this.cdr.detectChanges();
      }
  }

  calcularEdadParaTest(fechaNacimiento: string, fechaTest: string): number {
      if (!fechaNacimiento) return 0;
      const nac = new Date(fechaNacimiento);
      const test = new Date(fechaTest);
      let edad = test.getFullYear() - nac.getFullYear();
      const m = test.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && test.getDate() < nac.getDate())) {
          edad--;
      }
      return Math.max(0, edad);
  }

  obtenerRangoParaNota(valor: number, edad: number, tipo_evaluacion_id: number): any {
      if (valor === null || valor === undefined) return null;
      
      const rangosPosibles = this.todosLosRangos.filter(r => 
          r.tipo_evaluacion_id === tipo_evaluacion_id &&
          edad >= r.edad_min && edad <= r.edad_max
      );

      return rangosPosibles.find(r => valor >= r.valor_min && valor <= r.valor_max) || null;
  }
}