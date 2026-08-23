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
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './evaluaciones-kine.component.html',
  styleUrls: ['./evaluaciones-kine.component.scss']
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
  sesiones: any[] = [];
  sesionesOriginales: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = []; 
  tiposEvaluacion: any[] = [];
  loading: boolean = false;
  rangos: any[] = [];

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: EstadoSesion | null = null;
  
  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: EstadoSesion.PROGRAMADA },
    { label: 'Finalizado', value: EstadoSesion.FINALIZADA }
  ];

  // --- MODAL VER RESULTADOS ---
  displayViewDialog: boolean = false;
  sesionVista: any = null;
  resultadosVista: any[] = [];
  estudianteVistaSeleccionado: any = null;
  cargandoResultados: boolean = false;

  ngOnInit() {
    this.cargarDatosGenerales();
  }

  cargarDatosGenerales() {
    this.loading = true;

    this.grupoService.obtenerMisGrupos().subscribe({
      next: (gruposData) => {
        this.grupos = gruposData || [];
        const misGrupoIds = this.grupos.map(g => g.id).filter(id => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.kineTipoService.listarTiposEvaluacion().subscribe(t => {
            this.tiposEvaluacion = t || [];
            this.sesionesOriginales = [];
            this.sesionesFiltradas = [];
            this.loading = false;
            this.cdr.detectChanges();
          });
          return;
        }

        const peticionesSesiones = misGrupoIds.map(id => 
          this.kineSesionService.listarSesiones({ grupoId: id, limite: 1000 })
        );

        forkJoin({
          tipos: this.kineTipoService.listarTiposEvaluacion(),
          sesionesGrupos: forkJoin(peticionesSesiones)
        }).subscribe({
          next: ({ tipos, sesionesGrupos }) => {
            this.tiposEvaluacion = tipos || [];
            
            const todasLasSesiones = sesionesGrupos.flatMap(res => res.registros);
            
            this.sesionesOriginales = todasLasSesiones.map((s: any) => ({
                ...s,
                grupoObj: this.grupos.find(g => g.id === (s.grupo_id || s.grupoId)) || { nombre: 'Desconocido' },
                tipoObj: this.tiposEvaluacion.find(t => t.id === (s.tipo_evaluacion_id || s.tipoEvaluacionId)) || { nombre: 'Desconocido' }
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
      },
      error: () => {
        this.mostrarError('No se pudieron cargar tus grupos.');
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
    this.sesionesFiltradas = this.sesionesOriginales.filter(sesion => {
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

  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  }

  verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.cargandoResultados = true;
    this.displayViewDialog = true;
    this.cdr.detectChanges();

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
                subevaluacion_id: sub.id,
                nombre_parametro: sub.nombre,
                evalua_lados: sub.evalua_lados || sub.evaluaLados,
                resultado_unico: (resGuardado && (resGuardado.resultado_unico != null || resGuardado.resultadoUnico != null)) ? Number(resGuardado.resultado_unico || resGuardado.resultadoUnico) : null,
                resultado_izquierdo: (resGuardado && (resGuardado.resultado_izquierdo != null || resGuardado.resultadoIzquierdo != null)) ? Number(resGuardado.resultado_izquierdo || resGuardado.resultadoIzquierdo) : null,
                resultado_derecho: (resGuardado && (resGuardado.resultado_derecho != null || resGuardado.resultadoDerecho != null)) ? Number(resGuardado.resultado_derecho || resGuardado.resultadoDerecho) : null,
                observacion: resGuardado ? resGuardado.observacion : '',
                tiene_datos: !!resGuardado 
              };
            }).filter((e: any) => e.tiene_datos); 

            return {
              id: idUsuario,
              nombre: nombre,
              apellido: apellido,
              evaluaciones: evaluacionesDelAlumno
            };
          });

          this.resultadosVista = procesados.filter((a: any) => a.evaluaciones.length > 0); 
          this.estudianteVistaSeleccionado = this.resultadosVista.length > 0 ? this.resultadosVista[0] : null;
          
          this.cargandoResultados = false;
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
        this.mostrarError('Error al cargar la planilla de resultados.');
        this.cargandoResultados = false;
        this.displayViewDialog = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}