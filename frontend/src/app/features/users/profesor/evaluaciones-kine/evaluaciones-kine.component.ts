import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';

// Enum
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

// Servicios de Dominio
import { MessageService } from 'primeng/api';
import { KineTipoEvaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/tipos/services/tipo-evaluacion.service';
import { KineSubevaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/services/subevaluacion.service';
import { KineSesionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/service/sesion.service';
import { KineResultadoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/service/resultado.service';
import { KineRangoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/services/rango.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

// Modelos
import { KineSesion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/sesiones/models/sesion.interface';
import { KineTipoEvaluacion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/tipos/models/tipo-evaluacion.interface';
import { KineSubevaluacion } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/models/subevaluacion.interface';
import { KineResultadoConDetalle } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/models/resultado.interface';
import { KineRango } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/models/rango.interface';

// Módulos de PrimeNG
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

interface GrupoOption {
  id: number;
  nombre: string;
}

interface KineSesionVista extends KineSesion {
  grupoObj: GrupoOption | { nombre: string };
  tipoObj: KineTipoEvaluacion | { nombre: string };
}

interface EvaluacionParametroVista {
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

interface AlumnoResultadoVista {
  id: string;
  nombre: string;
  apellido: string;
  evaluaciones: EvaluacionParametroVista[];
}

@Component({
  selector: 'app-profesor-evaluaciones-kine',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    ToastModule,
    TooltipModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './evaluaciones-kine.component.html',
  styleUrls: ['./evaluaciones-kine.component.scss'],
})
export class ProfesorEvaluacionesKineComponent implements OnInit {
  readonly EstadoSesion = EstadoSesion;

  private kineTipoService = inject(KineTipoEvaluacionService);
  private kineSubService = inject(KineSubevaluacionService);
  private kineSesionService = inject(KineSesionService);
  private kineResultadoService = inject(KineResultadoService);
  private kineRangoService = inject(KineRangoService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // --- DATOS PRINCIPALES ---
  sesionesOriginales: KineSesionVista[] = [];
  sesionesFiltradas: KineSesionVista[] = [];
  grupos: GrupoOption[] = [];
  tiposEvaluacion: KineTipoEvaluacion[] = [];
  loading = false;
  rangos: KineRango[] = [];

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: GrupoOption | null = null;
  filtroPrueba: number | null = null;
  filtroEstado: EstadoSesion | null = null;

  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: EstadoSesion.PROGRAMADA },
    { label: 'Finalizado', value: EstadoSesion.FINALIZADA },
  ];

  // --- MODAL VER RESULTADOS ---
  displayViewDialog = false;
  sesionVista: KineSesionVista | null = null;
  resultadosVista: AlumnoResultadoVista[] = [];
  estudianteVistaSeleccionado: AlumnoResultadoVista | null = null;
  cargandoResultados = false;

  ngOnInit(): void {
    // 🔥 FIX: Diferimos la carga un microsegundo para evitar NG0100
    Promise.resolve().then(() => {
      this.cargarDatosGenerales();
    });
  }

  cargarDatosGenerales(): void {
    this.loading = true;
    this.cdr.markForCheck(); // 🔥 FIX: Le indicamos a Angular que estamos cargando

    this.grupoService.obtenerMisGrupos().subscribe({
      next: (gruposData: GrupoOption[]) => {
        this.grupos = gruposData || [];
        const misGrupoIds = this.grupos.map((g) => g.id).filter((id) => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.kineTipoService.listarTiposEvaluacion().subscribe((t) => {
            this.tiposEvaluacion = t || [];
            this.sesionesOriginales = [];
            this.sesionesFiltradas = [];
            this.loading = false;
            this.cdr.markForCheck();
          });
          return;
        }

        const peticionesSesiones = misGrupoIds.map((id) =>
          this.kineSesionService.listarSesiones({ grupoId: id, limite: 1000 }),
        );

        forkJoin({
          tipos: this.kineTipoService.listarTiposEvaluacion(),
          sesionesGrupos: forkJoin(peticionesSesiones),
        }).subscribe({
          next: ({ tipos, sesionesGrupos }) => {
            this.tiposEvaluacion = tipos || [];

            const todasLasSesiones = sesionesGrupos.flatMap((res) => res.registros);

            this.sesionesOriginales = todasLasSesiones.map((s) => ({
              ...s,
              grupoObj: this.grupos.find((g) => g.id === s.grupo_id) || { nombre: 'Desconocido' },
              tipoObj:
                this.tiposEvaluacion.find((t) => t.id === s.tipo_evaluacion_id) || { nombre: 'Desconocido' },
            }));

            this.aplicarFiltros();

            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.mostrarError('Error al cargar datos iniciales.');
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.mostrarError('No se pudieron cargar tus grupos.');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
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

  aplicarFiltros(): void {
    this.sesionesFiltradas = this.sesionesOriginales.filter((sesion) => {
      let cumpleFecha = true;
      let cumpleGrupo = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      if (this.filtroFecha) {
        const fechaFiltroStr = this.formatearFechaIso(this.filtroFecha);
        const fechaSesionStr = (sesion.fecha || '').substring(0, 10);
        cumpleFecha = fechaSesionStr === fechaFiltroStr;
      }

      if (this.filtroGrupo) {
        cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
      }

      if (this.filtroPrueba !== null) {
        cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba;
      }

      if (this.filtroEstado) {
        cumpleEstado = sesion.estado === this.filtroEstado;
      }

      return cumpleFecha && cumpleGrupo && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.aplicarFiltros();
  }

  private formatearFechaIso(fecha: Date | string | null): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  }

  verResultados(sesion: KineSesionVista): void {
    this.sesionVista = { ...sesion };
    this.cargandoResultados = true;
    this.displayViewDialog = true;
    this.cdr.detectChanges();

    const sGrupoId = sesion.grupo_id;
    const sTipoId = sesion.tipo_evaluacion_id;

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ grupoIds: [sGrupoId], limite: 1000, activo: true }),
      subevaluaciones: this.kineSubService.listarSubevaluacionesPorTipo(sTipoId),
      resultados: this.kineResultadoService.listarResultadosPorSesion(sesion.id),
    }).subscribe({
      next: (res) => {
        const subevaluacionesDefinidas: KineSubevaluacion[] = res.subevaluaciones || [];
        const resultadosPrevios: KineResultadoConDetalle[] = res.resultados || [];

        const peticionesRangos = subevaluacionesDefinidas.map((sub) =>
          this.kineRangoService.listarRangosPorSubevaluacion(sub.id),
        );

        const procesarDatos = () => {
          const procesados: AlumnoResultadoVista[] = (res.alumnos.registros || []).map((alumno: any) => {
            const idUsuario = alumno.perfil ? alumno.perfil.id_usuario : alumno.usuario_id ?? alumno.id;
            const nombre = alumno.perfil ? alumno.perfil.nombre : alumno.nombre;
            const apellido = alumno.perfil ? alumno.perfil.apellido : alumno.apellido;

            const evaluacionesDelAlumno: EvaluacionParametroVista[] = subevaluacionesDefinidas
              .map((sub) => {
                const resGuardado = resultadosPrevios.find(
                  (r) => r.estudiante_id === idUsuario && r.subevaluacion_id === sub.id,
                );

                return {
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
              })
              .filter((e) => e.tiene_datos);

            return {
              id: idUsuario,
              nombre,
              apellido,
              evaluaciones: evaluacionesDelAlumno,
            };
          });

          this.resultadosVista = procesados.filter((a) => a.evaluaciones.length > 0);
          this.estudianteVistaSeleccionado = this.resultadosVista[0] ?? null;

          this.cargandoResultados = false;
          this.cdr.detectChanges();
        };

        if (peticionesRangos.length > 0) {
          forkJoin(peticionesRangos as Observable<KineRango[]>[]).subscribe((rangosArrays) => {
            this.rangos = rangosArrays.flat();
            procesarDatos();
          });
        } else {
          this.rangos = [];
          procesarDatos();
        }
      },
      error: () => {
        this.mostrarError('Error al cargar la planilla de resultados.');
        this.cargandoResultados = false;
        this.displayViewDialog = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mostrarError(mensaje: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}