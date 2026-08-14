import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';

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

// Servicios de Dominio
import { TipoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/tipos/services/tipo-evaluacion.services';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';
import { RangoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/rangos/services/rango.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-administrador-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, 
    CheckboxModule, ToggleButtonModule, RadioButtonModule, TextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.css']
})
export class AdministradorEvaluacionesComponent implements OnInit {

  private tipoEvalService = inject(TipoEvaluacionService);
  private sesionService = inject(SesionEvaluacionService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private rangoService = inject(RangoEvaluacionService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

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
    { label: 'Azul', value: '#3b82f6' },
    { label: 'Verde', value: '#22c55e' },
    { label: 'Amarillo', value: '#eab308' },
    { label: 'Naranja', value: '#f97316' },
    { label: 'Rojo', value: '#ef4444' },
    { label: 'Gris', value: '#6b7280' }
  ];

  // --- ESTADOS UI ---
  loading: boolean = true;
  displayMainDialog: boolean = false;   
  displayTipoDialog: boolean = false;   
  displayGradesDialog: boolean = false; 
  
  usarRangos: boolean = false;

  // --- FORMULARIOS ---
  tipoForm: any = { id: null, nombre: '', unidad_medida: '', descripcion: '' }; 
  rangosForm: any[] = [];
  rangosOriginalesCache: any[] = []; // Para saber cuáles borrar/actualizar
  
  nuevoRango: any = { 
    edad_min: null,   
    edad_max: null,   
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

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS INICIAL
  // ==========================================
  cargarDatosIniciales() {
    this.loading = true;
    
    forkJoin({
      grupos: this.grupoService.listarGrupos(),
      tipos: this.tipoEvalService.listarTiposEvaluacion(),
      sesiones: this.sesionService.listarSesiones({ limite: 1000 })
    }).subscribe({
      next: (data) => {
        this.grupos = data.grupos || [];
        this.tiposEvaluacion = data.tipos || [];
        this.sesionesOriginales = data.sesiones.registros || [];
        
        this.sesiones = [...this.sesionesOriginales];
        this.aplicarFiltros(); 
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar datos.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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
    this.aplicarFiltros();
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
    this.cancelarEdicionTipo(); 
    this.displayTipoDialog = true;
  }

  cancelarEdicionTipo() {
    this.tipoForm = { id: null, nombre: '', unidad_medida: '', descripcion: '' };
    this.rangosForm = [];
    this.rangosOriginalesCache = [];
    this.usarRangos = false;
    this.nuevoRango = { edad_min: null, edad_max: null, nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#22c55e' };
  }

  editarTipoTest(test: any) {
    this.tipoForm = { ...test }; 
    this.displayTipoDialog = true;
    
    // Obtenemos los rangos dinámicamente
    this.rangoService.listarRangosPorTipo(test.id).subscribe({
      next: (rangos) => {
        this.rangosForm = rangos.sort((a: any, b: any) => a.edad_min - b.edad_min || a.valor_min - b.valor_min);
        this.rangosOriginalesCache = [...this.rangosForm];
        this.usarRangos = this.rangosForm.length > 0;
        this.cdr.detectChanges();
      }
    });
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
    
    if (this.nuevoRango.valor_min > this.nuevoRango.valor_max) {
      this.messageService.add({ severity: 'warn', summary: 'Valor Inválido', detail: 'El valor mínimo no puede ser mayor al máximo' });
      return;
    }

    const conflicto = this.rangosForm.find(r => {
      const solapanEdades = (this.nuevoRango.edad_min <= r.edad_max) && (this.nuevoRango.edad_max >= r.edad_min);
      const solapanValores = (this.nuevoRango.valor_min <= r.valor_max) && (this.nuevoRango.valor_max >= r.valor_min);
      const mismaEtiqueta = (r.nombre_etiqueta.trim().toUpperCase() === this.nuevoRango.nombre_etiqueta.trim().toUpperCase());

      return (solapanEdades && solapanValores) || (solapanEdades && mismaEtiqueta);
    });

    if (conflicto) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Cruce de Datos Detectado', 
        detail: `Los valores chocan con el rango '${conflicto.nombre_etiqueta}' para las mismas edades.` 
      });
      return;
    }

    this.rangosForm.push({ ...this.nuevoRango });
    this.nuevoRango.nombre_etiqueta = '';
    this.nuevoRango.valor_min = null;
    this.nuevoRango.valor_max = null;
  }

  quitarRangoDeLista(index: number) {
    this.rangosForm.splice(index, 1);
  }

  guardarNuevoTipo() {
    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El Nombre y la Unidad son obligatorios (*)' });
      return;
    }
    
    this.loading = true;
    const payloadTipo = { 
      nombre: this.tipoForm.nombre, 
      unidadMedida: this.tipoForm.unidad_medida || this.tipoForm.unidadMedida, 
      descripcion: this.tipoForm.descripcion 
    };

    const peticionTipo$ = this.tipoForm.id 
      ? this.tipoEvalService.actualizarTipoEvaluacion(this.tipoForm.id, payloadTipo)
      : this.tipoEvalService.crearTipoEvaluacion(payloadTipo);

    peticionTipo$.subscribe({
      next: (tipoGuardado: any) => {
        const testId = tipoGuardado.id;
        
        // --- Sincronizar Rangos ---
        const peticionesRangos: any[] = [];

        // 1. Identificar rangos eliminados
        const idsActuales = this.rangosForm.map(r => r.id).filter(id => id);
        this.rangosOriginalesCache.forEach(rOriginal => {
          if (!idsActuales.includes(rOriginal.id)) {
            peticionesRangos.push(this.rangoService.eliminarRango(rOriginal.id));
          }
        });

        // 2. Identificar rangos nuevos o modificados
        if (this.usarRangos) {
          this.rangosForm.forEach(rango => {
            const payloadRango = {
              tipoEvaluacionId: testId,
              edadMin: rango.edad_min || rango.edadMin,
              edadMax: rango.edad_max || rango.edadMax,
              nombreEtiqueta: rango.nombre_etiqueta || rango.nombreEtiqueta,
              valorMin: rango.valor_min || rango.valorMin,
              valorMax: rango.valor_max || rango.valorMax,
              colorSugerido: rango.color_sugerido || rango.colorSugerido
            };

            if (rango.id) {
              peticionesRangos.push(this.rangoService.actualizarRango(rango.id, payloadRango));
            } else {
              peticionesRangos.push(this.rangoService.crearRango(payloadRango));
            }
          });
        }

        if (peticionesRangos.length > 0) {
          forkJoin(peticionesRangos).subscribe({
            next: () => this.finalizarGuardadoTipo(),
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El Test se guardó, pero hubo un error con los rangos.' });
              this.loading = false;
            }
          });
        } else {
          this.finalizarGuardadoTipo();
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar el Test' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private finalizarGuardadoTipo() {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test configurado correctamente' });
    this.displayTipoDialog = false; 
    this.cargarDatosIniciales();
  }

  eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este test?\n\nSe eliminarán todas las sesiones y resultados históricos.\n\nEsta acción no se puede deshacer.',
      header: 'Confirmar Eliminación Crítica',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar todo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger', 
      accept: () => {
        this.tipoEvalService.eliminarTipoEvaluacion(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test eliminado' });
            if (this.tipoForm.id === id) this.displayTipoDialog = false;
            this.cargarDatosIniciales();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el test.' })
        });
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
    // Mapeo seguro en caso de que venga camelCase del backend
    this.evalLogistica.grupo_id = sesion.grupo_id || sesion.grupoId;
    this.evalLogistica.tipo_evaluacion_id = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    this.displayMainDialog = true;
  }

  crearSesionPlanificada() {
    if (!this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id || !this.evalLogistica.fecha) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios marcados con (*)' });
        return;
    }

    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    const payload = {
        grupoId: this.evalLogistica.grupo_id,
        tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaSeleccionada.toISOString().split('T')[0],
        estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    const peticion$ = this.evalLogistica.id 
      ? this.sesionService.actualizarSesion(this.evalLogistica.id, payload)
      : this.sesionService.crearSesion(payload);

    peticion$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
        this.displayMainDialog = false;
        this.cargarDatosIniciales(); 
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la sesión' })
    });
  }

  eliminarSesion(id: string) {
      this.confirmationService.confirm({
          message: '¿Eliminar sesión y todas sus notas asociadas?',
          header: 'Confirmar Eliminación',
          icon: 'pi pi-trash',
          acceptLabel: 'Eliminar',
          acceptButtonStyleClass: 'p-button-danger p-button-text',
          accept: () => {
              this.sesionService.eliminarSesion(id).subscribe({
                next: () => {
                  this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sesión borrada' });
                  this.cargarDatosIniciales();
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la sesión' })
              });
          }
      });
  }

  // ==========================================
  // 5. CALIFICACIÓN DE ESTUDIANTES
  // ==========================================
  abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    
    const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ grupoIds: [grupoIdToFetch], limite: 1000, activo: true }),
      resultados: this.resultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: ({ alumnos, resultados }) => {
        
        this.estudiantesGrupo = alumnos.registros.map((est: any) => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
          const nombre = est.perfil ? est.perfil.nombre : est.nombre;
          const apellido = est.perfil ? est.perfil.apellido : est.apellido;

          // ✅ Al tiparlo como : any evitamos el error ts(2551)
          const notaExistente: any = resultados.find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);
          
          return {
              resultado_id: notaExistente ? notaExistente.id : null, 
              estudiante_id: idUsuario,
              nombre: nombre,
              apellido: apellido,
              valor_numerico: notaExistente ? (notaExistente.valorNumerico || notaExistente.valor_numerico) : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
        });
        
        this.displayGradesDialog = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de estudiantes.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFila(estudiante: any) {
    estudiante.valor_numerico = null;
    estudiante.observacion = '';
  }

  guardarNotasFinales() {
    // Filtramos solo a los que se les ingresó nota o comentario
    const notasValidas = this.estudiantesGrupo.filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''));

    if (notasValidas.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
      return;
    }

    this.loading = true;
    
    // Armamos un arreglo de peticiones HTTP (PATCH si ya existía, POST si es nueva)
    const peticiones = notasValidas.map(e => {
      const payload = {
        sesionId: this.evalLogistica.id,
        estudianteId: e.estudiante_id,
        valorNumerico: e.valor_numerico,
        observacion: e.observacion || ''
      };

      if (e.resultado_id) {
        return this.resultadoService.actualizarResultado(e.resultado_id, payload);
      } else {
        return this.resultadoService.crearResultado(payload);
      }
    });

    forkJoin(peticiones).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Resultados actualizados correctamente' });
        this.displayGradesDialog = false;
        this.cargarDatosIniciales(); 
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar algunos resultados.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}