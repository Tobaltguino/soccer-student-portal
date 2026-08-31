import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';

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
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService, ConfirmationService } from 'primeng/api';

import { TipoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/tipos/services/tipo-evaluacion.services';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

@Component({
  selector: 'app-profesor-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, RadioButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.scss']
})
export class ProfesorEvaluacionesComponent implements OnInit {

  private tipoEvalService = inject(TipoEvaluacionService);
  private sesionService = inject(SesionEvaluacionService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  // Enum expuesto al template
  readonly EstadoSesion = EstadoSesion;

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
    { label: 'Programada', value: EstadoSesion.PROGRAMADA },
    { label: 'En Curso', value: EstadoSesion.EN_CURSO },
    { label: 'Finalizada', value: EstadoSesion.FINALIZADA },
    { label: 'Cancelada', value: EstadoSesion.CANCELADA }
  ];

  // --- ESTADOS UI ---
  loading: boolean = true;
  displayMainDialog: boolean = false;   
  displayGradesDialog: boolean = false; 

  evalLogistica: any = {
    id: null,
    grupo_id: null,
    tipo_evaluacion_id: null,
    fecha: null,
    estado: EstadoSesion.PROGRAMADA
  };

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS (SOLO SUS GRUPOS)
  // ==========================================
  cargarDatosIniciales() {
    this.loading = true;
    
    this.grupoService.obtenerMisGrupos().subscribe({
      next: (gruposData) => {
        // 🔥 FIX DEFINITIVO: Guardamos los grupos temporalmente aquí.
        // NO tocamos 'this.grupos' todavía para que Angular no vea cambios a medias.
        const tempGrupos = gruposData || [];
        const misGrupoIds = tempGrupos.map(g => g.id).filter(id => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.tipoEvalService.listarTiposEvaluacion().subscribe(t => {
            this.tiposEvaluacion = t || [];
            this.sesionesOriginales = [];
            this.sesiones = [];
            
            // Liberamos todo junto de golpe
            this.grupos = tempGrupos; 
            this.loading = false;
            this.cdr.detectChanges();
          });
          return;
        }

        const peticionesSesiones = misGrupoIds.map(id => 
          this.sesionService.listarSesiones({ grupoId: id, limite: 1000 })
        );

        forkJoin({
          tipos: this.tipoEvalService.listarTiposEvaluacion(),
          sesionesGrupos: forkJoin(peticionesSesiones)
        }).subscribe({
          next: ({ tipos, sesionesGrupos }) => {
            this.tiposEvaluacion = tipos || [];
            this.sesionesOriginales = sesionesGrupos.flatMap(res => res.registros);
            this.sesiones = [...this.sesionesOriginales];
            
            // 🔥 Liberamos todo junto de golpe en un solo movimiento atómico
            this.grupos = tempGrupos;
            this.aplicarFiltros();
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar sesiones.' });
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus grupos.' });
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
  // 3. GESTIÓN DE SESIONES (LOGÍSTICA)
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = { 
      id: null, 
      grupo_id: null, 
      tipo_evaluacion_id: null, 
      fecha: null, 
      estado: EstadoSesion.PROGRAMADA
    };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { ...sesion, fecha: fechaObj };
    this.evalLogistica.grupo_id = sesion.grupo_id || sesion.grupoId;
    this.evalLogistica.tipo_evaluacion_id = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    this.displayMainDialog = true;
  }

  crearSesionPlanificada() {
    if (!this.evalLogistica.fecha || !this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios (*).' });
        return;
    }

    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ severity: 'warn', summary: 'Fecha Inválida', detail: 'Ingrese una fecha válida para la sesión.' });
        return;
    }

    const payload = {
        grupoId: this.evalLogistica.grupo_id,
        tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaSeleccionada.toISOString().split('T')[0],
        estado: this.evalLogistica.estado || EstadoSesion.PROGRAMADA
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

  // ==========================================
  // 4. CALIFICACIÓN DE ESTUDIANTES
  // ==========================================
  abrirCalificador(sesion: any) {
    this.evalLogistica = { 
      ...sesion,
      grupoNombre: this.obtenerNombreGrupo(sesion),
      tipoEvaluacionResuelto: this.obtenerTipoEvaluacion(sesion)
    };
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
    if (estudiante.resultado_id) {
      this.confirmationService.confirm({
        message: '¿Eliminar la nota guardada de este estudiante?',
        header: 'Confirmar',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          this.resultadoService.eliminarResultado(estudiante.resultado_id).subscribe({
            next: () => {
              estudiante.resultado_id = null;
              estudiante.valor_numerico = null;
              estudiante.observacion = '';
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Nota eliminada correctamente.' });
              this.cdr.detectChanges();
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la nota.' });
            }
          });
        }
      });
    } else {
      estudiante.valor_numerico = null;
      estudiante.observacion = '';
    }
  }

  guardarNotasFinales() {
    const notasValidas = this.estudiantesGrupo.filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''));

    if (notasValidas.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
      return;
    }

    this.loading = true;
    
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

  /**
   * El backend no envía el grupo/tipo de evaluación embebido en la sesión,
   * solo los IDs. Los resolvemos localmente contra lo ya cargado.
   */
  obtenerNombreGrupo(sesion: any): string {
    const grupoId = sesion.grupo_id || sesion.grupoId;
    return this.grupos.find(g => g.id === grupoId)?.nombre || 'Grupo desconocido';
  }

  obtenerTipoEvaluacion(sesion: any): any {
    const tipoId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    return this.tiposEvaluacion.find(t => t.id === tipoId) || null;
  }
}