import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { KineSesionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/service/sesion.service';
import { KineSubevaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/services/subevaluacion.service';
import { KineResultadoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/service/resultado.service';
import { KineRangoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/services/rango.service';
import { KineTipoEvaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/tipos/services/tipo-evaluacion.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

import { KineSesion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/models/sesion.interface';
import {
  CrearKineSesionPayload,
  ActualizarKineSesionPayload,
} from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/models/sesion.interface';
import { KineSubevaluacion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/models/subevaluacion.interface';
import { KineResultadoConDetalle } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/models/resultado.interface';
import { KineRango } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/models/rango.interface';
import { KineTipoEvaluacion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/tipos/models/tipo-evaluacion.interface';
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

interface GrupoOption {
  id: number;
  nombre: string;
}

interface KineSesionVista extends KineSesion {
  grupoObj?: GrupoOption;
  tipoObj?: KineTipoEvaluacion;
}

type SesionFormModel = Omit<Partial<KineSesion>, 'fecha'> & {
  fecha?: Date | string | null;
  grupoObj?: GrupoOption;
  tipoObj?: KineTipoEvaluacion;
};

interface EvaluacionParametro {
  resultado_id: number | null;
  subevaluacion_id: number;
  nombre_parametro: string;
  evalua_lados: boolean;
  resultado_unico: number | null;
  resultado_izquierdo: number | null;
  resultado_derecho: number | null;
  observacion: string;
  tiene_datos: boolean;
  rango: { etiqueta: string; color: string | null } | null;
}

interface AlumnoEvaluacion {
  id: string;
  nombre: string;
  apellido: string;
  evaluado: boolean;
  evaluaciones: EvaluacionParametro[];
}

@Component({
  selector: 'app-kinesiologo-evaluaciones-kine',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    CheckboxModule,
    RadioButtonModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './evaluaciones-kine.component.html',
})
export class KinesiologoEvaluacionesKineComponent implements OnInit {
  loading = false;

  EstadoSesion = EstadoSesion;

  grupos: GrupoOption[] = [];
  tiposEvaluacion: KineTipoEvaluacion[] = [];
  subevaluacionesPorTipo = new Map<number, KineSubevaluacion[]>();
  rangos: KineRango[] = [];

  sesiones: KineSesionVista[] = [];
  sesionesFiltradas: KineSesionVista[] = [];

  filtroFecha: Date | null = null;
  filtroGrupo: number | null = null;
  filtroPrueba: number | null = null;
  filtroEstado: EstadoSesion | null = null;
  filtroIncluirEliminadas = false;

  opcionesEstadoFiltro = [
    { label: 'Programada', value: EstadoSesion.PROGRAMADA },
    { label: 'En curso', value: EstadoSesion.EN_CURSO },
    { label: 'Finalizada', value: EstadoSesion.FINALIZADA },
    { label: 'Cancelada', value: EstadoSesion.CANCELADA },
  ];

  displayMainDialog = false;
  evalLogistica: SesionFormModel = {};
  private estadoOriginal: EstadoSesion | null = null;

  displayGradesDialog = false;
  estudiantesGrupo: AlumnoEvaluacion[] = [];
  estudianteSeleccionado: AlumnoEvaluacion | null = null;

  displayViewDialog = false;
  sesionVista: KineSesionVista | null = null;
  resultadosVista: AlumnoEvaluacion[] = [];
  estudianteVistaSeleccionado: AlumnoEvaluacion | null = null;

  constructor(
    private kineSesionService: KineSesionService,
    private kineSubevaluacionService: KineSubevaluacionService,
    private kineResultadoService: KineResultadoService,
    private kineRangoService: KineRangoService,
    private kineTipoEvaluacionService: KineTipoEvaluacionService,
    private grupoService: GrupoService,
    private estudianteService: EstudianteService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarDatosGenerales();
  }

  cargarDatosGenerales(): void {
    this.loading = true;

    this.grupoService.obtenerMisGrupos().subscribe({
      next: (grupos: GrupoOption[]) => {
        this.grupos = grupos || [];

        if (this.grupos.length === 0) {
          this.sesiones = [];
          this.sesionesFiltradas = [];
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        const misGrupoIds = this.grupos.map((g) => g.id);

        const peticionesSesiones = misGrupoIds.map((id) =>
          this.kineSesionService.listarSesiones({
            grupoId: id,
            limite: 1000,
            incluirEliminadas: this.filtroIncluirEliminadas,
          }),
        );

        forkJoin([
          this.kineTipoEvaluacionService.listarTiposEvaluacion(),
          forkJoin(peticionesSesiones),
        ]).subscribe({
          next: ([tipos, resultadosPorGrupo]) => {
            this.tiposEvaluacion = tipos || [];

            const mapaGrupos = new Map(this.grupos.map((g) => [g.id, g]));
            const mapaTipos = new Map(this.tiposEvaluacion.map((t) => [t.id, t]));

            const todasLasSesiones = resultadosPorGrupo.flatMap((r) => r.registros);

            this.sesiones = todasLasSesiones
              .map((sesion) => ({
                ...sesion,
                grupoObj: mapaGrupos.get(sesion.grupo_id),
                tipoObj: mapaTipos.get(sesion.tipo_evaluacion_id),
              }))
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            this.aplicarFiltros();
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.mostrarError('No se pudieron cargar las sesiones.');
            this.loading = false;
          },
        });
      },
      error: () => {
        this.mostrarError('No se pudieron cargar tus grupos.');
        this.loading = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.sesionesFiltradas = this.sesiones.filter((sesion) => {
      if (this.filtroGrupo && sesion.grupo_id !== this.filtroGrupo) return false;
      if (this.filtroPrueba && sesion.tipo_evaluacion_id !== this.filtroPrueba) return false;
      if (this.filtroEstado && sesion.estado !== this.filtroEstado) return false;

      if (this.filtroFecha) {
        const fechaSesion = new Date(sesion.fecha).toDateString();
        const fechaFiltro = new Date(this.filtroFecha).toDateString();
        if (fechaSesion !== fechaFiltro) return false;
      }

      return true;
    });
  }

  limpiarFiltros(): void {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.aplicarFiltros();
  }

  toggleIncluirEliminadas(): void {
    this.cargarDatosGenerales();
  }

  getSeverityPuntaje(puntaje: number | string | null, subevaluacionId: number): Severity {
    if (puntaje === null || puntaje === undefined || puntaje === ('' as unknown)) {
      return 'secondary';
    }

    const puntajeNum = Number(puntaje);
    if (Number.isNaN(puntajeNum)) return 'secondary';

    const rango = this.rangos.find(
      (r) => r.puntaje === puntajeNum && r.subevaluacion_id === subevaluacionId,
    );

    if (!rango) return 'secondary';

    switch (rango.color) {
      case 'rojo':
      case '#ef4444':
        return 'danger';
      case 'amarillo':
      case '#eab308':
        return 'warn';
      case 'verde':
      case '#22c55e':
        return 'success';
      default:
        return 'info';
    }
  }

  abrirNuevo(): void {
    this.evalLogistica = { estado: EstadoSesion.PROGRAMADA };
    this.estadoOriginal = null;
    this.displayMainDialog = true;
  }

  editarSesion(sesion: KineSesionVista): void {
    this.evalLogistica = {
      ...sesion,
      fecha: this.convertirStringADate(sesion.fecha),
    };
    this.estadoOriginal = sesion.estado;
    this.displayMainDialog = true;
  }

  guardarSesionLogistica(): void {
    if (!this.evalLogistica.fecha) {
      this.mostrarAdvertencia('Selecciona una fecha para la sesión.');
      return;
    }

    const fechaIso = this.formatearFechaIso(this.evalLogistica.fecha);

    if (this.evalLogistica.id) {
      const payload: ActualizarKineSesionPayload = {
        fecha: fechaIso,
        observacion: this.evalLogistica.observacion || undefined,
      };

      const estadoCambio =
        !!this.evalLogistica.estado && this.evalLogistica.estado !== this.estadoOriginal;

      this.loading = true;

      const actualizar$ = this.kineSesionService.actualizarSesion(this.evalLogistica.id, payload);

      const flujo$: Observable<unknown> = estadoCambio
        ? actualizar$.pipe(
            switchMap(() =>
              this.kineSesionService.cambiarEstado(this.evalLogistica.id as string, {
                estado: this.evalLogistica.estado as EstadoSesion,
              }),
            ),
          )
        : actualizar$;

      flujo$.subscribe({
        next: () => {
          this.mostrarExito('Sesión guardada correctamente.');
          this.displayMainDialog = false;
          this.loading = false;
          this.cargarDatosGenerales();
        },
        error: () => {
          this.mostrarError('Ocurrió un error al guardar la sesión.');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      if (!this.evalLogistica.grupo_id) {
        this.mostrarAdvertencia('Selecciona un grupo.');
        return;
      }
      if (!this.evalLogistica.tipo_evaluacion_id) {
        this.mostrarAdvertencia('Selecciona el tipo de prueba.');
        return;
      }

      const payload: CrearKineSesionPayload = {
        fecha: fechaIso,
        grupoId: this.evalLogistica.grupo_id,
        tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id,
        observacion: this.evalLogistica.observacion || undefined,
      };

      this.loading = true;

      this.kineSesionService.crearSesion(payload).subscribe({
        next: () => {
          this.mostrarExito('Sesión creada correctamente.');
          this.displayMainDialog = false;
          this.loading = false;
          this.cargarDatosGenerales();
        },
        error: () => {
          this.mostrarError('Ocurrió un error al crear la sesión.');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  confirmarEliminarSesion(sesion: KineSesionVista): void {
    this.confirmationService.confirm({
      message:
        'Esta sesión quedará marcada como eliminada. Sus resultados dejarán de aparecer mientras esté así, ' +
        'pero puedes restaurarla después desde el filtro "Mostrar eliminadas".',
      header: 'Eliminar sesión',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.kineSesionService.eliminarSesion(sesion.id).subscribe({
          next: () => {
            this.mostrarExito('Sesión eliminada.');
            this.cargarDatosGenerales();
          },
          error: () => this.mostrarError('No se pudo eliminar la sesión.'),
        });
      },
    });
  }

  restaurarSesion(sesion: KineSesionVista): void {
    this.confirmationService.confirm({
      message: '¿Deseas restaurar esta sesión eliminada?',
      header: 'Restaurar sesión',
      icon: 'pi pi-refresh',
      acceptLabel: 'Sí, restaurar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.kineSesionService.restaurarSesion(sesion.id).subscribe({
          next: () => {
            this.mostrarExito('Sesión restaurada.');
            this.cargarDatosGenerales();
          },
          error: () => this.mostrarError('No se pudo restaurar la sesión.'),
        });
      },
    });
  }

  verificarSiEstaEvaluado(alumno: AlumnoEvaluacion): boolean {
    return alumno.evaluaciones.every((sub) =>
      sub.evalua_lados
        ? sub.resultado_izquierdo !== null && sub.resultado_derecho !== null
        : sub.resultado_unico !== null,
    );
  }

  actualizarEstadoEstudiante(alumno: AlumnoEvaluacion): void {
    alumno.evaluado = this.verificarSiEstaEvaluado(alumno);
  }

  limpiarFila(sub: EvaluacionParametro): void {
    sub.resultado_unico = null;
    sub.resultado_izquierdo = null;
    sub.resultado_derecho = null;
    sub.observacion = '';
  }

  abrirCalificador(sesion: KineSesionVista): void {
    this.evalLogistica = { ...sesion };
    this.prepararModal(sesion, 'calificar');
  }

  verResultados(sesion: KineSesionVista): void {
    this.sesionVista = sesion;
    this.prepararModal(sesion, 'ver');
  }

  private prepararModal(sesion: KineSesionVista, modo: 'calificar' | 'ver'): void {
    this.loading = true;

    const sGrupoId = sesion.grupo_id;
    const sTipoId = sesion.tipo_evaluacion_id;

    forkJoin({
      subevaluaciones: this.kineSubevaluacionService.listarSubevaluacionesPorTipo(sTipoId),
      estudiantes: this.estudianteService.listarEstudiantes({
        grupoIds: [sGrupoId],
        limite: 1000,
        activo: true,
      }),
      resultados: this.kineResultadoService.listarResultadosPorSesion(sesion.id),
    }).subscribe({
      next: ({ subevaluaciones, estudiantes, resultados }) => {
        const listaSubevaluaciones: KineSubevaluacion[] = subevaluaciones || [];
        this.subevaluacionesPorTipo.set(sTipoId, listaSubevaluaciones);

        const idsSubevaluaciones = listaSubevaluaciones.map((s) => s.id);

        const peticionesRangos = idsSubevaluaciones.map((id) =>
          this.kineRangoService.listarRangosPorSubevaluacion(id),
        );

        const cargarRangos$ =
          peticionesRangos.length > 0 ? forkJoin(peticionesRangos) : of([] as KineRango[][]);

        cargarRangos$.subscribe((rangosPorSub) => {
          this.rangos = rangosPorSub.flat();

          const resultadosPorAlumnoYSub = new Map<string, KineResultadoConDetalle>();
          (resultados || []).forEach((r: KineResultadoConDetalle) => {
            resultadosPorAlumnoYSub.set(`${r.estudiante_id}-${r.subevaluacion_id}`, r);
          });

          const alumnos: AlumnoEvaluacion[] = (estudiantes?.registros || estudiantes || []).map(
            (alumno: any) => {
              const idAlumno = alumno.usuario_id ?? alumno.id;
              const nombre = alumno.perfil?.nombre ?? alumno.nombre ?? '';
              const apellido = alumno.perfil?.apellido ?? alumno.apellido ?? '';

              const evaluaciones: EvaluacionParametro[] = listaSubevaluaciones.map((sub) => {
                const resGuardado = resultadosPorAlumnoYSub.get(`${idAlumno}-${sub.id}`);

                return {
                  resultado_id: resGuardado?.id ?? null,
                  subevaluacion_id: sub.id,
                  nombre_parametro: sub.nombre,
                  evalua_lados: sub.evalua_lados,
                  resultado_unico:
                    resGuardado?.resultado_unico != null ? Number(resGuardado.resultado_unico) : null,
                  resultado_izquierdo:
                    resGuardado?.resultado_izquierdo != null
                      ? Number(resGuardado.resultado_izquierdo)
                      : null,
                  resultado_derecho:
                    resGuardado?.resultado_derecho != null
                      ? Number(resGuardado.resultado_derecho)
                      : null,
                  observacion: resGuardado?.observacion ?? '',
                  tiene_datos: !!resGuardado,
                  rango: resGuardado?.rango ?? null,
                };
              });

              const alumnoEvaluacion: AlumnoEvaluacion = {
                id: idAlumno,
                nombre,
                apellido,
                evaluado: false,
                evaluaciones,
              };
              alumnoEvaluacion.evaluado = this.verificarSiEstaEvaluado(alumnoEvaluacion);
              return alumnoEvaluacion;
            },
          );

          if (modo === 'calificar') {
            this.estudiantesGrupo = alumnos;
            this.estudianteSeleccionado = alumnos[0] ?? null;
            this.displayGradesDialog = true;
          } else {
            this.resultadosVista = alumnos;
            this.estudianteVistaSeleccionado = alumnos[0] ?? null;
            this.displayViewDialog = true;
          }

          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.mostrarError('No se pudieron cargar los datos de la sesión.');
        this.loading = false;
      },
    });
  }

  guardarNotasFinales(): void {
    const filasIncompletas: string[] = [];

    interface PeticionInfo {
      alumno: AlumnoEvaluacion;
      sub: EvaluacionParametro;
      esCreacion: boolean;
      request$: Observable<KineResultadoConDetalle>;
    }

    const peticiones: PeticionInfo[] = [];

    this.estudiantesGrupo.forEach((alumno) => {
      alumno.evaluaciones.forEach((sub) => {
        const tieneAlgo =
          sub.resultado_unico !== null ||
          sub.resultado_izquierdo !== null ||
          sub.resultado_derecho !== null ||
          (sub.observacion && sub.observacion.trim() !== '');

        if (!tieneAlgo) return;

        if (sub.evalua_lados && (sub.resultado_izquierdo === null || sub.resultado_derecho === null)) {
          filasIncompletas.push(`${alumno.apellido}, ${alumno.nombre} — ${sub.nombre_parametro}`);
          return;
        }

        const payload = {
          sesionId: this.evalLogistica.id as string,
          estudianteId: alumno.id,
          subevaluacionId: sub.subevaluacion_id,
          resultadoUnico: sub.resultado_unico !== null ? String(sub.resultado_unico) : undefined,
          resultadoIzquierdo:
            sub.resultado_izquierdo !== null ? String(sub.resultado_izquierdo) : undefined,
          resultadoDerecho:
            sub.resultado_derecho !== null ? String(sub.resultado_derecho) : undefined,
          observacion: sub.observacion || undefined,
        };

        const esCreacion = !sub.resultado_id;
        const request$ = esCreacion
          ? this.kineResultadoService.crearResultado(payload)
          : this.kineResultadoService.actualizarResultado(sub.resultado_id as number, payload);

        peticiones.push({ alumno, sub, esCreacion, request$ });
      });
    });

    if (filasIncompletas.length > 0) {
      this.mostrarAdvertencia(
        `Estos parámetros miden ambos lados y les falta un valor. Complétalos o límpialos antes de guardar: ${filasIncompletas.join(' · ')}`,
      );
      return;
    }

    if (peticiones.length === 0) {
      this.mostrarAdvertencia('No hay datos nuevos para guardar.');
      return;
    }

    this.loading = true;

    const peticionesConManejo = peticiones.map((info) =>
      info.request$.pipe(
        map((resultado) => ({ ok: true as const, info, resultado })),
        catchError((error) => of({ ok: false as const, info, error })),
      ),
    );

    forkJoin(peticionesConManejo).subscribe((resultados) => {
      const exitosos = resultados.filter((r) => r.ok) as Array<{
        ok: true;
        info: PeticionInfo;
        resultado: KineResultadoConDetalle;
      }>;
      const fallidos = resultados.filter((r) => !r.ok);

      exitosos.forEach((r) => {
        if (r.info.esCreacion) {
          r.info.sub.resultado_id = r.resultado.id;
          r.info.sub.rango = r.resultado.rango;
        }
      });

      this.loading = false;

      if (fallidos.length > 0) {
        const detalle = fallidos
          .map((f) => `${f.info.alumno.apellido} — ${f.info.sub.nombre_parametro}`)
          .join(' · ');
        this.mostrarError(
          `Se guardaron ${exitosos.length} de ${resultados.length} registros. Revisa y reintenta: ${detalle}`,
        );
        this.cdr.detectChanges();
        return;
      }

      if (this.evalLogistica.estado === EstadoSesion.PROGRAMADA) {
        this.confirmationService.confirm({
          message: '¿Deseas marcar esta sesión como FINALIZADA?',
          header: 'Sesión completada',
          icon: 'pi pi-check-circle',
          acceptLabel: 'Sí, finalizar',
          rejectLabel: 'No, dejar pendiente',
          accept: () => {
            this.kineSesionService
              .cambiarEstado(this.evalLogistica.id as string, { estado: EstadoSesion.FINALIZADA })
              .subscribe(() => {
                this.mostrarExito('Resultados guardados y sesión finalizada.');
                this.displayGradesDialog = false;
                this.cargarDatosGenerales();
              });
          },
          reject: () => {
            this.mostrarExito('Resultados guardados correctamente.');
            this.displayGradesDialog = false;
            this.cargarDatosGenerales();
          },
        });
      } else {
        this.mostrarExito('Resultados guardados correctamente.');
        this.displayGradesDialog = false;
        this.cargarDatosGenerales();
      }
    });
  }

  private formatearFechaIso(fecha: Date | string): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return d.toISOString();
  }

  private convertirStringADate(fecha: string | null | undefined): Date | null {
    return fecha ? new Date(fecha) : null;
  }

  private mostrarExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Listo', detail });
  }

  private mostrarError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 6000 });
  }

  private mostrarAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Atención', detail, life: 5000 });
  }
}