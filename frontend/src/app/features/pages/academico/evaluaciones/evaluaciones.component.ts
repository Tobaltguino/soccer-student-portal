import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

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
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';

import { TipoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/tipos/services/tipo-evaluacion.services';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';
import { RangoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/rangos/services/rango.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';
import { Genero } from '../../../../shared/enums/genero.enum';

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, 
    CheckboxModule, TextareaModule, RadioButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.scss']
})
export class EvaluacionesComponent implements OnInit {

  private authService = inject(AuthService);
  private tipoEvalService = inject(TipoEvaluacionService);
  private sesionService = inject(SesionEvaluacionService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private rangoService = inject(RangoEvaluacionService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private excelService = inject(ExcelExportService);
  private cdr = inject(ChangeDetectorRef);
  
  readonly EstadoSesion = EstadoSesion;

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false;
  esEstudiante: boolean = false;

  // Datos Generales
  sesiones: any[] = [];            
  sesionesOriginales: any[] = [];  
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = []; 
  
  // Datos Estudiante
  evaluacionesMisResultados: any[] = [];
  evaluacionesMisResultadosOriginales: any[] = [];
  tiposTestsEstudiante: any[] = [];   

  // Filtros
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: any = null;

  opcionesEstadoFiltro = [
    { label: 'Programada', value: EstadoSesion.PROGRAMADA },
    { label: 'En Curso', value: EstadoSesion.EN_CURSO },
    { label: 'Finalizada', value: EstadoSesion.FINALIZADA },
    { label: 'Cancelada', value: EstadoSesion.CANCELADA }
  ];

  opcionesColor = [
    { label: 'Azul', value: '#3b82f6' }, { label: 'Verde', value: '#22c55e' },
    { label: 'Amarillo', value: '#eab308' }, { label: 'Naranja', value: '#f97316' },
    { label: 'Rojo', value: '#ef4444' }, { label: 'Gris', value: '#6b7280' }
  ];

  opcionesGenero = [
    { label: 'Masculino', value: Genero.MASCULINO },
    { label: 'Femenino', value: Genero.FEMENINO }
  ];

  // Estados UI
  loading: boolean = true;
  guardando: boolean = false; 
  displayTipoDialog: boolean = false;   
  displayGradesDialog: boolean = false; 
  displayMainDialog: boolean = false; // Para sesiones
  displayDetalle: boolean = false; // Estudiante
  
  usarRangos: boolean = false;
  selectedEvalEstudiante: any = null;

  // Formularios
  tipoForm: any = { id: null, nombre: '', unidad_medida: '', descripcion: '' }; 
  rangosForm: any[] = [];
  rangosOriginalesCache: any[] = [];
  
  nuevoRango: any = { 
    genero: null, edad_min: null, edad_max: null, 
    nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#22c55e' 
  };

  evalLogistica: any = {
    id: null, grupo_id: null, tipo_evaluacion_id: null, 
    fecha: null, estado: EstadoSesion.PROGRAMADA
  };

  sesionSeleccionada: any = null;

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esAdmin = this.rolActual === 'administrador';
      this.esEstudiante = this.rolActual === 'estudiante';
      this.esStaff = this.rolActual === 'profesor' || this.rolActual === 'kinesiologo';

      if (this.esEstudiante) {
        await this.cargarEvaluacionesEstudiante();
      } else {
        await this.cargarDatosGestion();
      }
    } catch (error) {
      console.error('Error inicializando evaluaciones:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // GESTIÓN (ADMIN Y STAFF)
  // =========================================================
  async cargarDatosGestion() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      if (this.esAdmin) {
        const [grupos, tipos, sesionesRes] = await Promise.all([
          firstValueFrom(this.grupoService.listarGrupos()),
          firstValueFrom(this.tipoEvalService.listarTiposEvaluacion()),
          firstValueFrom(this.sesionService.listarSesiones({ limite: 1000 }))
        ]);
        this.grupos = grupos || [];
        this.tiposEvaluacion = tipos || [];
        this.sesionesOriginales = sesionesRes?.registros || [];
      } else if (this.esStaff) {
        const gruposData = await firstValueFrom(this.grupoService.obtenerMisGrupos());
        const tempGrupos = gruposData || [];
        const misGrupoIds = tempGrupos.map((g: any) => g.id).filter((id: any) => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.tiposEvaluacion = await firstValueFrom(this.tipoEvalService.listarTiposEvaluacion()) || [];
          this.sesionesOriginales = [];
          this.grupos = tempGrupos;
        } else {
          const peticionesSesiones = misGrupoIds.map(id => firstValueFrom(this.sesionService.listarSesiones({ grupoId: id, limite: 1000 })));
          
          const [tipos, ...sesionesGrupos] = await Promise.all([
            firstValueFrom(this.tipoEvalService.listarTiposEvaluacion()),
            ...peticionesSesiones
          ]);

          this.tiposEvaluacion = tipos || [];
          this.sesionesOriginales = sesionesGrupos.flatMap((res: any) => res.registros);
          this.grupos = tempGrupos;
        }
      }

      this.sesiones = [...this.sesionesOriginales];
      this.aplicarFiltrosGestion();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar datos de gestión.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltrosGestion() {
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
        if (this.filtroGrupo) cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
        if (this.filtroPrueba) cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
        if (this.filtroEstado) cumpleEstado = sesion.estado === this.filtroEstado;

        return cumpleFecha && cumpleGrupo && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltrosGestion() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.aplicarFiltrosGestion();
  }

  // --- CONFIGURACIÓN DE TIPOS DE EVALUACIÓN (SOLO ADMIN) ---
  abrirNuevoTipo() {
    this.cancelarEdicionTipo(); 
    this.displayTipoDialog = true;
  }

  cancelarEdicionTipo() {
    this.tipoForm = { id: null, nombre: '', unidad_medida: '', descripcion: '' };
    this.rangosForm = [];
    this.rangosOriginalesCache = [];
    this.usarRangos = false;
    this.nuevoRango = { genero: null, edad_min: null, edad_max: null, nombre_etiqueta: '', valor_min: null, valor_max: null, color_sugerido: '#22c55e' };
  }

  async editarTipoTest(test: any) {
    this.tipoForm = { ...test }; 
    this.displayTipoDialog = true;
    
    try {
      const rangos = await firstValueFrom(this.rangoService.listarRangosPorTipo(test.id));
      this.rangosForm = rangos.sort((a: any, b: any) => a.edad_min - b.edad_min || a.valor_min - b.valor_min);
      this.rangosOriginalesCache = [...this.rangosForm];
      this.usarRangos = this.rangosForm.length > 0;
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los rangos.' });
    }
    this.cdr.detectChanges();
  }

  agregarRangoALista() {
    if (!this.nuevoRango.genero || this.nuevoRango.edad_min === null || this.nuevoRango.edad_max === null || !this.nuevoRango.nombre_etiqueta || this.nuevoRango.valor_min === null || this.nuevoRango.valor_max === null) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Llene todos los campos del rango (*), incluyendo el género.' });
      return;
    }

    if (this.nuevoRango.edad_min > this.nuevoRango.edad_max) {
      this.messageService.add({ severity: 'warn', summary: 'Inválido', detail: 'La edad mínima no puede ser mayor a la máxima' });
      return;
    }
    
    if (this.nuevoRango.valor_min > this.nuevoRango.valor_max) {
      this.messageService.add({ severity: 'warn', summary: 'Inválido', detail: 'El valor mínimo no puede ser mayor al máximo' });
      return;
    }

    const conflicto = this.rangosForm.find(r => {
      const mismoGenero = r.genero === this.nuevoRango.genero; 
      const solapanEdades = (this.nuevoRango.edad_min <= (r.edad_max ?? r.edadMax)) && (this.nuevoRango.edad_max >= (r.edad_min ?? r.edadMin));
      const solapanValores = (this.nuevoRango.valor_min <= (r.valor_max ?? r.valorMax)) && (this.nuevoRango.valor_max >= (r.valor_min ?? r.valorMin));
      const mismaEtiqueta = ((r.nombre_etiqueta ?? r.nombreEtiqueta).trim().toUpperCase() === this.nuevoRango.nombre_etiqueta.trim().toUpperCase());

      return mismoGenero && ((solapanEdades && solapanValores) || (solapanEdades && mismaEtiqueta));
    });

    if (conflicto) {
      this.messageService.add({ severity: 'error', summary: 'Cruce Detectado', detail: `Choca con el rango '${conflicto.nombre_etiqueta || conflicto.nombreEtiqueta}' para el mismo género y edades.` });
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

  async guardarNuevoTipo() {
    if (this.guardando) return;

    if (!this.tipoForm.nombre || !this.tipoForm.unidad_medida) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Nombre y Unidad son obligatorios (*)' });
      return;
    }
    
    this.guardando = true;
    this.cdr.detectChanges();

    const payloadTipo = { 
      nombre: this.tipoForm.nombre, 
      unidadMedida: this.tipoForm.unidad_medida || this.tipoForm.unidadMedida, 
      descripcion: this.tipoForm.descripcion 
    };

    try {
      const tipoGuardado: any = this.tipoForm.id 
        ? await firstValueFrom(this.tipoEvalService.actualizarTipoEvaluacion(this.tipoForm.id, payloadTipo))
        : await firstValueFrom(this.tipoEvalService.crearTipoEvaluacion(payloadTipo));

      const testId = tipoGuardado.id;
      const peticionesRangos: Promise<any>[] = [];

      const idsActuales = this.rangosForm.map(r => r.id).filter(id => id);
      this.rangosOriginalesCache.forEach(rOriginal => {
        if (!idsActuales.includes(rOriginal.id)) {
          peticionesRangos.push(firstValueFrom(this.rangoService.eliminarRango(rOriginal.id)));
        }
      });

      if (this.usarRangos) {
        this.rangosForm.forEach(rango => {
          const payloadRango = {
            tipoEvaluacionId: testId,
            genero: rango.genero,
            edadMin: rango.edad_min ?? rango.edadMin,
            edadMax: rango.edad_max ?? rango.edadMax,
            nombreEtiqueta: rango.nombre_etiqueta ?? rango.nombreEtiqueta,
            valorMin: rango.valor_min ?? rango.valorMin,
            valorMax: rango.valor_max ?? rango.valorMax,
            colorSugerido: rango.color_sugerido ?? rango.colorSugerido
          };

          if (rango.id) {
            peticionesRangos.push(firstValueFrom(this.rangoService.actualizarRango(rango.id, payloadRango)));
          } else {
            peticionesRangos.push(firstValueFrom(this.rangoService.crearRango(payloadRango)));
          }
        });
      }

      await Promise.all(peticionesRangos);

      this.guardando = false;
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test configurado correctamente' });
      this.displayTipoDialog = false; 
      await this.cargarDatosGestion();
    } catch (error) {
      this.guardando = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar el Test o sus rangos.' });
      this.cdr.detectChanges();
    }
  }

  eliminarTipoTest(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este test?\nSe eliminarán todas las sesiones y resultados históricos.',
      header: 'Confirmar Eliminación Crítica',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar todo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger', 
      accept: async () => {
        try {
          await firstValueFrom(this.tipoEvalService.eliminarTipoEvaluacion(id));
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Test eliminado' });
          if (this.tipoForm.id === id) this.displayTipoDialog = false;
          await this.cargarDatosGestion();
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el test.' });
        }
      }
    });
  }

  // --- GESTIÓN DE SESIONES ---
  abrirNuevaSesion() {
    this.evalLogistica = { id: null, grupo_id: null, tipo_evaluacion_id: null, fecha: null, estado: EstadoSesion.PROGRAMADA };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { ...sesion, fecha: fechaObj };
    this.evalLogistica.grupo_id = sesion.grupo_id || sesion.grupoId;
    this.evalLogistica.tipo_evaluacion_id = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    this.displayMainDialog = true;
  }

  async crearSesionPlanificada() {
    if (!this.evalLogistica.fecha || !this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
        this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Complete todos los campos obligatorios (*).' });
        return;
    }

    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ severity: 'warn', summary: 'Inválido', detail: 'Ingrese una fecha válida.' });
        return;
    }

    const payload = {
        grupoId: this.evalLogistica.grupo_id,
        tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaSeleccionada.toISOString().split('T')[0],
        estado: this.evalLogistica.estado || EstadoSesion.PROGRAMADA
    };

    try {
      if (this.evalLogistica.id) {
        await firstValueFrom(this.sesionService.actualizarSesion(this.evalLogistica.id, payload));
      } else {
        await firstValueFrom(this.sesionService.crearSesion(payload));
      }
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      await this.cargarDatosGestion(); 
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la sesión' });
    }
  }

  eliminarSesion(id: string) {
      this.confirmationService.confirm({
          message: '¿Eliminar sesión y todas sus notas asociadas?',
          header: 'Confirmar Eliminación',
          icon: 'pi pi-trash',
          acceptLabel: 'Eliminar',
          acceptButtonStyleClass: 'p-button-danger p-button-text',
          accept: async () => {
              try {
                await firstValueFrom(this.sesionService.eliminarSesion(id));
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sesión borrada' });
                await this.cargarDatosGestion();
              } catch (error) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la sesión' });
              }
          }
      });
  }

  // --- CALIFICADOR DE RESULTADOS ---
  async abrirCalificador(sesion: any) {
    this.sesionSeleccionada = {
      ...sesion,
      grupoNombre: this.obtenerNombreGrupo(sesion),
      tipoEvaluacionResuelto: this.obtenerTipoEvaluacion(sesion)
    };
    
    this.loading = true;
    this.cdr.detectChanges();
    
    const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;

    try {
      const [alumnos, resultados] = await Promise.all([
        firstValueFrom(this.estudianteService.listarEstudiantes({ grupoIds: [grupoIdToFetch], limite: 1000, activo: true })),
        firstValueFrom(this.resultadoService.listarResultadosPorSesion(sesion.id))
      ]);

      const estudiantesFinales: any[] = [];
      const idsProcesados = new Set<string>();

      (alumnos.registros || []).forEach((est: any) => {
        const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
        const nombre = est.perfil ? est.perfil.nombre : est.nombre;
        const apellido = est.perfil ? est.perfil.apellido : est.apellido;

        const notaExistente: any = (resultados || []).find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);
        
        idsProcesados.add(idUsuario);

        estudiantesFinales.push({
            resultado_id: notaExistente ? notaExistente.id : null,
            estudiante_id: idUsuario,
            nombre: nombre,
            apellido: apellido,
            valor_numerico: notaExistente ? (notaExistente.valorNumerico || notaExistente.valor_numerico) : null,
            observacion: notaExistente ? notaExistente.observacion : '',
            rango: notaExistente ? notaExistente.rango : null,
            activoEnGrupo: true 
        });
      });

      (resultados || []).forEach((r: any) => {
        const idUsuario = r.estudianteId || r.estudiante_id;
        if (!idsProcesados.has(idUsuario)) {
          estudiantesFinales.push({
            resultado_id: r.id, 
            estudiante_id: idUsuario,
            nombre: r.alumno?.nombre || 'Desconocido', 
            apellido: r.alumno?.apellido || '',
            valor_numerico: r.valorNumerico || r.valor_numerico,
            observacion: r.observacion || '',
            rango: r.rango || null,
            activoEnGrupo: false 
          });
        }
      });
      
      this.estudiantesGrupo = estudiantesFinales;
      this.displayGradesDialog = true;
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de estudiantes.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  limpiarFila(estudiante: any) {
    if (estudiante.resultado_id) {
      this.confirmationService.confirm({
        message: '¿Eliminar la nota guardada de este estudiante?',
        header: 'Confirmar',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        accept: async () => {
          try {
            await firstValueFrom(this.resultadoService.eliminarResultado(estudiante.resultado_id));
            estudiante.resultado_id = null;
            estudiante.valor_numerico = null;
            estudiante.observacion = '';
            estudiante.rango = null;
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Nota eliminada.' });
            this.cdr.detectChanges();
          } catch (error) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la nota.' });
          }
        }
      });
    } else {
      estudiante.valor_numerico = null;
      estudiante.observacion = '';
      estudiante.rango = null;
    }
  }

  async guardarNotasFinales() {
    const notasValidas = this.estudiantesGrupo.filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''));

    if (notasValidas.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      const peticiones = notasValidas.map(e => {
        const payload = {
          sesionId: this.sesionSeleccionada.id,
          estudianteId: e.estudiante_id,
          valorNumerico: e.valor_numerico,
          observacion: e.observacion || ''
        };
  
        if (e.resultado_id) {
          return firstValueFrom(this.resultadoService.actualizarResultado(e.resultado_id, payload));
        } else {
          return firstValueFrom(this.resultadoService.crearResultado(payload));
        }
      });

      await Promise.all(peticiones);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Resultados actualizados.' });
      this.displayGradesDialog = false;
      await this.cargarDatosGestion(); 
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar algunos resultados.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- EXPORTAR EXCEL ---
  descargarExcelPorSesion(sesion: any) {
    if (!sesion || !sesion.id) return;
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando archivo Excel...' });
    this.excelService.exportarResultadosAcademicos(sesion.id);
  }

  // =========================================================
  // VISTA ESTUDIANTE
  // =========================================================
  async cargarEvaluacionesEstudiante() {
    this.loading = true;
    
    try {
      const data = await firstValueFrom(this.resultadoService.listarMisResultados());
      
      this.evaluacionesMisResultadosOriginales = (data || []).map((r: any) => {
          const evaluacion = r.evaluacion || {};
          const rango = r.rango || {};

          return {
              fecha: evaluacion.fecha,
              test_nombre: evaluacion.nombre || 'Evaluación',
              edad_evaluacion: r.edadEvaluacion ?? 0,
              resultado: r.valorNumerico || r.valor_numerico,
              unidad: evaluacion.unidadMedida || evaluacion.unidad_medida || '',
              nivel: rango.nombreEtiqueta || rango.nombre_etiqueta || 'Registrado',
              color: rango.colorSugerido || rango.color_sugerido || '#3b82f6',
              test_descripcion: evaluacion.descripcion || '',
              observacion: r.observacion || '',
              created_at: r.createdAt || r.created_at || new Date().toISOString()
          };
      });

      this.evaluacionesMisResultadosOriginales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const nombresUnicos = [...new Set(this.evaluacionesMisResultadosOriginales.map(e => e.test_nombre))];
      this.tiposTestsEstudiante = nombresUnicos.map(nombre => ({ nombre: nombre }));

      this.aplicarFiltrosEstudiante();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus evaluaciones.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltrosEstudiante() {
    this.evaluacionesMisResultados = this.evaluacionesMisResultadosOriginales.filter(e => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const fStr = this.formatearFecha(this.filtroFecha);
        cumpleFecha = e.fecha === fStr;
      }
      if (this.filtroPrueba) {
        cumplePrueba = e.test_nombre === this.filtroPrueba.nombre;
      }
      
      return cumpleFecha && cumplePrueba;
    });
  }

  limpiarFiltrosEstudiante() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.aplicarFiltrosEstudiante();
  }

  verDetalleEstudiante(evaluacion: any) {
    this.selectedEvalEstudiante = evaluacion;
    this.displayDetalle = true;
  }

  getNivelSeverity(nivel: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const n = nivel?.toLowerCase();
    if (n === 'alto') return 'success';
    if (n === 'medio') return 'warn';
    if (n === 'bajo') return 'danger';
    if (n === 'registrado') return 'info';
    return 'secondary';
  }

  // --- UTILIDADES GLOBALES ---
  obtenerNombreGrupo(sesion: any): string {
    const grupoId = sesion.grupo_id || sesion.grupoId;
    return this.grupos.find(g => g.id === grupoId)?.nombre || 'Grupo desconocido';
  }

  obtenerTipoEvaluacion(sesion: any): any {
    const tipoId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    return this.tiposEvaluacion.find(t => t.id === tipoId) || null;
  }

  formatearFecha(date: any): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    } catch (e) {
        return '';
    }
  }
}