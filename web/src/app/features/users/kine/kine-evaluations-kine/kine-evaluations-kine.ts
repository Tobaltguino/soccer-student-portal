import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Servicios
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';
import { HealthService } from '../../../../core/services/health.service';
import { AcademyService } from '../../../../core/services/academy.service';

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
  selector: 'app-kine-evaluations-kine',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TableModule, 
    ButtonModule, 
    DialogModule,
    InputTextModule, 
    TextareaModule, 
    SelectModule, 
    DatePickerModule,
    TagModule, 
    ToastModule, 
    ConfirmDialogModule, 
    TooltipModule, 
    RadioButtonModule,
    InputNumberModule,
    ProgressSpinnerModule
  ],
  templateUrl: './kine-evaluations-kine.html',
  styleUrl: './kine-evaluations-kine.css',
  providers: [MessageService, ConfirmationService]
})
export class KineEvaluationsKineComponent implements OnInit {

  // --- DATOS PRINCIPALES ---
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  loading: boolean = false;
  usuarioActual: any;
  rangos: any[] = [];

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: string | null = null;
  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  // --- MODAL LOGÍSTICA ---
  displayMainDialog: boolean = false;
  evalLogistica: any = {};

  // --- MODAL CALIFICADOR (Vista Dividida) ---
  displayGradesDialog: boolean = false;
  estudiantesGrupo: any[] = [];
  estudianteSeleccionado: any = null;
  
  // --- MODAL VER RESULTADOS (Vista Dividida) ---
  displayViewDialog: boolean = false;
  sesionVista: any = null;
  resultadosVista: any[] = [];
  estudianteVistaSeleccionado: any = null;

  constructor(
    private healthService: HealthService,
    private authService: AuthService,
    private academyService: AcademyService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const userRes = await this.authService.getUser();
    this.usuarioActual = userRes.data?.user; 

    await this.cargarCatalogos();
    await this.cargarSesiones();
  }

  // ==========================================
  // CARGA DE DATOS (CATÁLOGOS)
  // ==========================================
  async cargarCatalogos() {
    try {
      const resTipos = await this.healthService.getTiposEvaluacionKine();
      if (resTipos.data) {
        this.tiposEvaluacion = resTipos.data;
      }

      const resRangos = await this.healthService.getRangosEvaluacion();
      if (resRangos.data) this.rangos = resRangos.data;

      if (this.usuarioActual?.email) {
        const kineInfo = await this.healthService.getKineByEmail(this.usuarioActual.email);
        if (kineInfo.data) {
           this.usuarioActual.db_id = kineInfo.data.id; 
           
           const resGrupos = await this.healthService.getGruposDeKine(kineInfo.data.id);
           if (resGrupos.data) {
              this.grupos = resGrupos.data.map((g: any) => g.grupos);
           }
        }
      }
    } catch (error) {
      this.mostrarError('Error al cargar catálogos.');
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

  async cargarSesiones() {
    this.loading = true;
    try {
      const { data, error } = await this.healthService.getEvaluacionesKine();
      
      if (error) throw error;

      if (data) {
        this.sesiones = data.map((s: any) => ({
            ...s,
            grupos: s.grupos || this.grupos.find(g => g.id === s.grupo_id) || { nombre: 'Desconocido' },
            tipo_evaluacion: s.tipo_evaluacion || this.tiposEvaluacion.find(t => t.id === s.tipo_evaluacion_id) || { nombre: 'Desconocido' }
        }));
        this.aplicarFiltros();
      }
    } catch (error) {
      this.mostrarError('Error al cargar las sesiones.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // ==========================================
  // FILTROS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(sesion => {
      let cumpleFecha = true;
      let cumpleGrupo = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      if (this.filtroFecha) {
        const fechaFiltroStr = this.formatearFechaIso(this.filtroFecha);
        cumpleFecha = sesion.fecha === fechaFiltroStr;
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

  // ==========================================
  // MODAL: LOGÍSTICA
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = { estado: 'PENDIENTE' };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    this.evalLogistica = { 
      ...sesion,
      fecha: this.convertirStringADate(sesion.fecha)
    };
    this.displayMainDialog = true;
  }

  async guardarSesionLogistica() {
    if (!this.evalLogistica.fecha) return this.mostrarAdvertencia('Selecciona una fecha.');
    if (!this.evalLogistica.grupo_id) return this.mostrarAdvertencia('Selecciona un grupo.');
    if (!this.evalLogistica.tipo_evaluacion_id) return this.mostrarAdvertencia('Selecciona el tipo de prueba.');

    const payload = {
      fecha: this.formatearFechaIso(this.evalLogistica.fecha),
      grupo_id: this.evalLogistica.grupo_id,
      tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id, 
      estado: this.evalLogistica.estado || 'PENDIENTE',
      kinesiologo_id: this.usuarioActual?.db_id 
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
      
      this.displayMainDialog = false;
      await this.cargarSesiones();
    } catch (error: any) {
      this.mostrarError(error.message || 'Ocurrió un error al guardar la sesión.');
    }
  }

  // ==========================================
  // LÓGICA DE VALIDACIÓN ESTRICTA
  // ==========================================
  verificarSiEstaEvaluado(evaluaciones: any[]): boolean {
    if (!evaluaciones || evaluaciones.length === 0) return false;
    
    // Verifica que CADA parámetro tenga su respectivo valor numérico (incluyendo el cero)
    return evaluaciones.every(sub => {
      // Nos aseguramos de interpretar bien el booleano
      const evaluaLados = sub.evalua_lados === true || sub.evalua_lados === 'true';

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
    // El setTimeout le da tiempo a Angular de guardar el número exacto que escribiste 
    // antes de hacer la comprobación matemática.
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
    // Ejecutamos la actualización también al borrar
    this.actualizarEstadoEstudiante();
  }

  // ==========================================
  // MODAL: CALIFICADOR (VISTA DIVIDIDA)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data: alumnos, error: errAlumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      if (errAlumnos) throw errAlumnos;

      const { data: subevaluaciones, error: errSub } = await this.healthService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      if (errSub) throw errSub;

      const { data: resultadosPrevios, error: errRes } = await this.healthService.getResultadosPorSesionKine(sesion.id);
      if (errRes) throw errRes;
      
      this.estudiantesGrupo = (alumnos || []).map(alumno => {
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

      if (this.estudiantesGrupo.length > 0) {
        this.estudianteSeleccionado = this.estudiantesGrupo[0];
      } else {
        this.estudianteSeleccionado = null;
      }

      this.displayGradesDialog = true;
    } catch (error: any) {
      console.error(error);
      this.mostrarError(error.message || 'Error al cargar la planilla.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async guardarNotasFinales() {
    const registrosAGuardar: any[] = [];

    this.estudiantesGrupo.forEach(estudiante => {
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
              this.displayGradesDialog = false;
              this.cargarSesiones();
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
    } catch (error: any) {
      console.error("Error al guardar evaluación:", error);
      this.mostrarError(error.message || 'Error al guardar los resultados. Verifica la regla UNIQUE en BD.');
    }
  }

  // ==========================================
  // MODAL: VER RESULTADOS
  // ==========================================
  async verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data: alumnos, error: errAlumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      if (errAlumnos) throw errAlumnos;

      const { data: subevaluaciones } = await this.healthService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      const subevaluacionesDefinidas = subevaluaciones || [];
      
      const { data: resultadosPrevios } = await this.healthService.getResultadosPorSesionKine(sesion.id);

      this.resultadosVista = (alumnos || []).map(alumno => {
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

      if (this.resultadosVista.length > 0) {
        this.estudianteVistaSeleccionado = this.resultadosVista[0];
      } else {
        this.estudianteVistaSeleccionado = null;
      }

      this.displayViewDialog = true;
    } catch (error: any) {
      this.mostrarError(error.message || 'Error al cargar los resultados.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================
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

  private mostrarExito(mensaje: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
  }

  private mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }

  private mostrarAdvertencia(mensaje: string) {
    this.messageService.add({ severity: 'warn', summary: 'Atención', detail: mensaje });
  }
}