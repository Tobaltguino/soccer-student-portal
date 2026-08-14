import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';

// Enums (Ajusta la ruta según tu proyecto si es necesario)
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

// Servicios de Dominio
import { ConfirmationService, MessageService } from 'primeng/api';
import { KineTipoEvaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/tipos/services/tipo-evaluacion.service';
import { KineSubevaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/services/subevaluacion.service';
import { KineSesionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/service/sesion.service';
import { KineResultadoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/service/resultado.service';
import { KineRangoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/services/rango.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';

// Módulos de PrimeNG
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-administrador-evaluaciones-kine',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, 
    RadioButtonModule, InputNumberModule, ProgressSpinnerModule
  ],
  templateUrl: './evaluaciones-kine.component.html',
  styleUrls: ['./evaluaciones-kine.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class AdministradorEvaluacionesKineComponent implements OnInit {

  // ✅ Exponemos el Enum para poder usarlo en el HTML
  readonly EstadoSesion = EstadoSesion;

  // Inyección de Servicios
  private kineTipoService = inject(KineTipoEvaluacionService);
  private kineSubService = inject(KineSubevaluacionService);
  private kineSesionService = inject(KineSesionService);
  private kineResultadoService = inject(KineResultadoService);
  private kineRangoService = inject(KineRangoService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  // --- DATOS PRINCIPALES ---
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  kinesiologos: any[] = []; 
  loading: boolean = false;
  rangos: any[] = [];

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: EstadoSesion | null = null;
  
  opcionesEstadoFiltro = [
    { label: 'Programada (Pendiente)', value: EstadoSesion.PROGRAMADA },
    { label: 'Finalizada', value: EstadoSesion.FINALIZADA }
  ];

  // --- MODAL LOGÍSTICA ---
  displayMainDialog: boolean = false;
  evalLogistica: any = {};

  // --- MODAL CALIFICADOR & VISOR ---
  displayGradesDialog: boolean = false;
  displayViewDialog: boolean = false;
  
  estudiantesGrupo: any[] = [];
  estudianteSeleccionado: any = null;
  
  sesionVista: any = null;
  resultadosVista: any[] = [];
  estudianteVistaSeleccionado: any = null;

  ngOnInit() {
    this.cargarDatosGenerales();
  }

  cargarDatosGenerales() {
    this.loading = true;

    // ✅ Obligamos a TypeScript a saber que esto es un Observable de arreglos para evitar el error de ".map en {}"
    const kinesiologosReq: Observable<any[]> = (this.usuarioService as any).listarKinesiologos 
      ? (this.usuarioService as any).listarKinesiologos() 
      : of<any[]>([]); 

    forkJoin({
      tipos: this.kineTipoService.listarTiposEvaluacion(),
      grupos: this.grupoService.listarGrupos(),
      kines: kinesiologosReq,
      sesiones: this.kineSesionService.listarSesiones({ limite: 1000 })
    }).subscribe({
      next: (data) => {
        this.tiposEvaluacion = data.tipos || [];
        this.grupos = data.grupos || [];
        
        // ✅ Forzamos el tipado para asegurar que reconozca el .map
        this.kinesiologos = (data.kines as any[] || []).map((k: any) => ({ 
            ...k, nombreCompleto: `${k.nombre} ${k.apellido}` 
        }));
        
        this.sesiones = (data.sesiones.registros as any[] || []).map((s: any) => ({
            ...s,
            grupoObj: this.grupos.find(g => g.id === (s.grupo_id || s.grupoId)) || { nombre: 'Desconocido' },
            tipoObj: this.tiposEvaluacion.find(t => t.id === (s.tipo_evaluacion_id || s.tipoEvaluacionId)) || { nombre: 'Desconocido' },
            kinesiologoObj: this.kinesiologos.find(k => k.id === (s.kinesiologo_id || s.kinesiologoId)) 
        }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar datos iniciales.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSeverityPuntaje(puntaje: number | string | null, subevaluacionId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    if (puntaje === null || puntaje === undefined || puntaje === '') return 'secondary';
    
    const puntajeNum = Number(puntaje);
    const rango = this.rangos.find(r => 
      (r.puntaje === puntajeNum || r.valor_min === puntajeNum) && 
      (r.subevaluacion_id === subevaluacionId || r.subevaluacionId === subevaluacionId)
    );
    
    const color = rango?.color || rango?.color_sugerido || rango?.colorSugerido;
    switch (color) {
      case 'rojo': case '#ef4444': return 'danger';
      case 'amarillo': case '#eab308': return 'warn';
      case 'verde': case '#22c55e': return 'success';
      default: return 'info';
    }
  }

  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(sesion => {
      let cumpleFecha = true;
      let cumpleGrupo = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      const gId = sesion.grupo_id || sesion.grupoId;
      const tId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

      if (this.filtroFecha) {
        const fechaFiltroStr = this.formatearFechaIso(this.filtroFecha);
        const fechaSesionStr = (sesion.fecha || '').substring(0, 10);
        cumpleFecha = fechaSesionStr === fechaFiltroStr;
      }
      if (this.filtroGrupo) cumpleGrupo = gId === this.filtroGrupo.id;
      if (this.filtroPrueba) cumplePrueba = tId === this.filtroPrueba.id;
      if (this.filtroEstado) cumpleEstado = sesion.estado === this.filtroEstado;

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

  abrirNuevo() {
    this.evalLogistica = { estado: EstadoSesion.PROGRAMADA };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    this.evalLogistica = { 
      ...sesion,
      grupo_id: sesion.grupo_id || sesion.grupoId,
      tipo_evaluacion_id: sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId,
      kinesiologo_id: sesion.kinesiologo_id || sesion.kinesiologoId,
      fecha: this.convertirStringADate(sesion.fecha)
    };
    this.displayMainDialog = true;
  }

  guardarSesionLogistica() {
    if (!this.evalLogistica.fecha) return this.mostrarAdvertencia('Selecciona una fecha.');
    if (!this.evalLogistica.grupo_id) return this.mostrarAdvertencia('Selecciona un grupo.');
    if (!this.evalLogistica.tipo_evaluacion_id) return this.mostrarAdvertencia('Selecciona el tipo de prueba.');
    if (!this.evalLogistica.kinesiologo_id) return this.mostrarAdvertencia('Asigna un Kinesiólogo.');

    this.loading = true;
    const payload = {
      fecha: this.formatearFechaIso(this.evalLogistica.fecha),
      grupoId: this.evalLogistica.grupo_id,
      tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id, 
      estado: this.evalLogistica.estado || EstadoSesion.PROGRAMADA,
      kinesiologoId: this.evalLogistica.kinesiologo_id 
    };

    const peticion$ = this.evalLogistica.id 
      ? this.kineSesionService.actualizarSesion(this.evalLogistica.id, payload)
      : this.kineSesionService.crearSesion(payload);

    peticion$.subscribe({
      next: () => {
        this.mostrarExito('Sesión guardada correctamente.');
        this.displayMainDialog = false;
        this.cargarDatosGenerales();
      },
      error: () => {
        this.mostrarError('Ocurrió un error al guardar la sesión.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmarEliminarSesion(sesion: any) {
    this.confirmationService.confirm({
      message: '¿Deseas eliminar permanentemente esta sesión? Esto borrará todas las notas.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.kineSesionService.eliminarSesion(sesion.id).subscribe({
          next: () => {
            this.mostrarExito('La sesión fue eliminada exitosamente.');
            this.cargarDatosGenerales(); 
          },
          error: () => this.mostrarError('No se pudo eliminar la sesión.')
        });
      }
    });
  }

  verificarSiEstaEvaluado(evaluaciones: any[]): boolean {
    if (!evaluaciones || evaluaciones.length === 0) return false;
    
    return evaluaciones.every(sub => {
      const evaluaLados = sub.evalua_lados === true || sub.evalua_lados === 'true' || sub.evaluaLados === true;

      if (evaluaLados) {
        const izqLleno = sub.resultado_izquierdo !== null && sub.resultado_izquierdo !== undefined && sub.resultado_izquierdo !== '';
        const derLleno = sub.resultado_derecho !== null && sub.resultado_derecho !== undefined && sub.resultado_derecho !== '';
        return izqLleno && derLleno;
      } else {
        const unicoLleno = sub.resultado_unico !== null && sub.resultado_unico !== undefined && sub.resultado_unico !== '';
        return unicoLleno;
      }
    });
  }

  actualizarEstadoEstudiante() {
    setTimeout(() => {
      if (this.estudianteSeleccionado) {
        this.estudianteSeleccionado.evaluado = this.verificarSiEstaEvaluado(this.estudianteSeleccionado.evaluaciones);
      }
    }, 50);
  }

  limpiarFila(sub: any) {
    sub.resultado_unico = null;
    sub.resultado_izquierdo = null;
    sub.resultado_derecho = null;
    sub.observacion = '';
    this.actualizarEstadoEstudiante();
  }

  abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.prepararModal(sesion, 'calificador');
  }

  verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.prepararModal(sesion, 'visor');
  }

  private prepararModal(sesion: any, modo: 'calificador' | 'visor') {
    this.loading = true;
    const sGrupoId = sesion.grupo_id || sesion.grupoId;
    const sTipoId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ grupoIds: [sGrupoId], limite: 1000, activo: true }),
      subevaluaciones: this.kineSubService.listarSubevaluacionesPorTipo(sTipoId),
      resultados: this.kineResultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: (res) => {
        const subevaluacionesDefinidas = res.subevaluaciones || [];
        const resultadosPrevios = res.resultados || [];
        
        const peticionesRangos = subevaluacionesDefinidas.map((sub: any) => this.kineRangoService.listarRangosPorSubevaluacion(sub.id));
        
        const procesarDatos = () => {
          const procesados = res.alumnos.registros.map((alumno: any) => {
            const idUsuario = alumno.perfil ? alumno.perfil.id_usuario : alumno.usuario_id || alumno.id;
            const nombre = alumno.perfil ? alumno.perfil.nombre : alumno.nombre;
            const apellido = alumno.perfil ? alumno.perfil.apellido : alumno.apellido;

            const evaluacionesDelAlumno = subevaluacionesDefinidas.map((sub: any) => {
              const resGuardado: any = resultadosPrevios.find((r: any) => 
                (r.estudiante_id === idUsuario || r.estudianteId === idUsuario) && 
                (r.subevaluacion_id === sub.id || r.subevaluacionId === sub.id)
              );

              return {
                resultado_id: resGuardado ? resGuardado.id : null,
                subevaluacion_id: sub.id,
                nombre_parametro: sub.nombre,
                evalua_lados: sub.evalua_lados || sub.evaluaLados,
                resultado_unico: (resGuardado && (resGuardado.resultado_unico != null || resGuardado.resultadoUnico != null)) ? Number(resGuardado.resultado_unico || resGuardado.resultadoUnico) : null,
                resultado_izquierdo: (resGuardado && (resGuardado.resultado_izquierdo != null || resGuardado.resultadoIzquierdo != null)) ? Number(resGuardado.resultado_izquierdo || resGuardado.resultadoIzquierdo) : null,
                resultado_derecho: (resGuardado && (resGuardado.resultado_derecho != null || resGuardado.resultadoDerecho != null)) ? Number(resGuardado.resultado_derecho || resGuardado.resultadoDerecho) : null,
                observacion: resGuardado ? resGuardado.observacion : '',
                tiene_datos: !!resGuardado 
              };
            });

            return {
              id: idUsuario,
              nombre: nombre,
              apellido: apellido,
              evaluado: this.verificarSiEstaEvaluado(evaluacionesDelAlumno),
              evaluaciones: modo === 'visor' ? evaluacionesDelAlumno.filter(e => e.tiene_datos) : evaluacionesDelAlumno
            };
          });

          if (modo === 'calificador') {
            this.estudiantesGrupo = procesados;
            this.estudianteSeleccionado = this.estudiantesGrupo.length > 0 ? this.estudiantesGrupo[0] : null;
            this.displayGradesDialog = true;
          } else {
            this.resultadosVista = procesados.filter((a: any) => a.evaluaciones.length > 0); 
            this.estudianteVistaSeleccionado = this.resultadosVista.length > 0 ? this.resultadosVista[0] : null;
            this.displayViewDialog = true;
          }
          
          this.loading = false;
          this.cdr.detectChanges();
        };

        if (peticionesRangos.length > 0) {
          forkJoin(peticionesRangos as Observable<any[]>[]).subscribe((rangosArrays: any[]) => {
            this.rangos = rangosArrays.flat();
            procesarDatos();
          });
        } else {
          this.rangos = [];
          procesarDatos();
        }
      },
      error: () => {
        this.mostrarError('Error al cargar la planilla.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarNotasFinales() {
    const peticionesAGuardar: any[] = [];

    this.estudiantesGrupo.forEach(estudiante => {
      estudiante.evaluaciones.forEach((sub: any) => {
        if (
          sub.resultado_unico !== null || 
          sub.resultado_izquierdo !== null || 
          sub.resultado_derecho !== null || 
          (sub.observacion && sub.observacion.trim() !== '')
        ) {
          const payload = {
            sesionId: this.evalLogistica.id,
            estudianteId: estudiante.id,
            subevaluacionId: sub.subevaluacion_id,
            resultadoUnico: sub.resultado_unico !== null ? String(sub.resultado_unico) : undefined,
            resultadoIzquierdo: sub.resultado_izquierdo !== null ? String(sub.resultado_izquierdo) : undefined,
            resultadoDerecho: sub.resultado_derecho !== null ? String(sub.resultado_derecho) : undefined,
            observacion: sub.observacion || ''
          };

          if (sub.resultado_id) {
            peticionesAGuardar.push(this.kineResultadoService.actualizarResultado(sub.resultado_id, payload));
          } else {
            peticionesAGuardar.push(this.kineResultadoService.crearResultado(payload));
          }
        }
      });
    });

    if (peticionesAGuardar.length === 0) {
      this.mostrarAdvertencia('No has ingresado ningún dato para guardar.');
      return;
    }

    this.loading = true;
    forkJoin(peticionesAGuardar).subscribe({
      next: () => {
        // ✅ Comparamos con el Enum
        if (this.evalLogistica.estado === EstadoSesion.PROGRAMADA) {
          this.confirmationService.confirm({
            message: '¿Deseas marcar esta sesión como FINALIZADA?',
            header: 'Sesión Completada',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Sí, finalizar',
            rejectLabel: 'No, dejar pendiente',
            accept: () => {
                this.kineSesionService.cambiarEstado(this.evalLogistica.id, { estado: EstadoSesion.FINALIZADA }).subscribe(() => {
                  this.mostrarExito('Resultados guardados y sesión finalizada.');
                  this.displayGradesDialog = false;
                  this.cargarDatosGenerales();
                });
            },
            reject: () => {
                this.mostrarExito('Resultados guardados correctamente.');
                this.displayGradesDialog = false;
            }
          });
        } else {
          this.mostrarExito('Resultados guardados correctamente.');
          this.displayGradesDialog = false;
        }
      },
      error: () => {
        this.mostrarError('Error al guardar los resultados.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // UTILIDADES
  // ==========================================
  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  }

  private convertirStringADate(fechaStr: string): Date | null {
    if (!fechaStr) return null;
    const [year, month, day] = fechaStr.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  private mostrarExito(mensaje: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje }); }
  private mostrarError(mensaje: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje }); }
  private mostrarAdvertencia(mensaje: string) { this.messageService.add({ severity: 'warn', summary: 'Atención', detail: mensaje }); }
}