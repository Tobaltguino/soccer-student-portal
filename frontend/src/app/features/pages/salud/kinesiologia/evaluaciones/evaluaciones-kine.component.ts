import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Enums compartidos
import { EstadoSesion } from '../../../../../shared/enums/estado-sesion.enum';
import { Rol } from '../../../administracion/usuarios/models/usuario-central.interface';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';

// Servicios de Core y Feature-Based
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ExcelExportService } from '../../../../../core/services/excel-export.service';
import { UsuarioCentralService } from '../../../administracion/usuarios/services/usuarios-central.service';
import { GrupoService } from '../../../academico/grupos/services/grupo.service';

// Servicios Locales Kinesiología
import { KineTipoEvaluacionService } from './services/kine-tipo-evaluacion.service';
import { KineSubevaluacionService } from './services/kine-subevaluacion.service';
import { KineSesionService } from './services/kine-sesion.service';
import { KineResultadoService } from './services/kine-resultado.service';

@Component({
  selector: 'app-evaluaciones-kine',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, InputTextModule, InputNumberModule,
    ToastModule, ConfirmDialogModule, TooltipModule, ProgressSpinnerModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones-kine.component.html',
  styleUrls: ['./evaluaciones-kine.component.scss']
})
export class EvaluacionesKineComponent implements OnInit {
  
  readonly EstadoSesion = EstadoSesion;

  private authService = inject(AuthService);
  private kineTipoService = inject(KineTipoEvaluacionService);
  private kineSubevaluacionService = inject(KineSubevaluacionService);
  private kineSesionService = inject(KineSesionService);
  private kineResultadoService = inject(KineResultadoService);
  private grupoService = inject(GrupoService);
  private usuarioService = inject(UsuarioCentralService);
  private excelService = inject(ExcelExportService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService); 
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false; // Kinesiólogo
  esEstudiante: boolean = false;
  esLector: boolean = false; // Profesor: solo ve sesiones y resultados de sus grupos

  // Colecciones Principales
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  
  // Estado Split View (Calificador / Visor)
  estudiantesGrupo: any[] = [];
  estudianteSeleccionado: any = null;
  resultadosVista: any[] = [];
  estudianteVistaSeleccionado: any = null;
  sesionVista: any = null;

  // Filtros
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: EstadoSesion | null = null;

  opcionesEstadoFiltro = [
    { label: 'Programada', value: EstadoSesion.PROGRAMADA },
    { label: 'En Curso', value: EstadoSesion.EN_CURSO },
    { label: 'Finalizada', value: EstadoSesion.FINALIZADA },
    { label: 'Cancelada', value: EstadoSesion.CANCELADA }
  ];

  // Modales
  displayMainDialog = false;
  displayGradesDialog = false; // Staff
  displayViewDialog = false; // Admin / Estudiante / Staff Lectura
  
  loading = false;
  cargandoResultados = false;
  guardando = false;

  evalLogistica: any = {};

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
      this.esStaff = this.rolActual === 'kinesiologo';
      this.esLector = this.rolActual === 'profesor';

      if (this.esEstudiante) {
        await this.cargarSesionesDelEstudiante();
      } else {
        await this.cargarDatosGenerales();
      }
    } catch (error) {
      this.mostrarError('Error inicializando evaluaciones kinésicas.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (GESTIÓN ADMIN / STAFF)
  // ==========================================
  async cargarDatosGenerales() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 🔥 Promesas Nativas
      const [tiposRes, gruposRes] = await Promise.all([
        this.kineTipoService.listarTiposEvaluacion(),
        this.esAdmin ? this.grupoService.listarGrupos() : this.grupoService.obtenerMisGrupos()
      ]);

      this.tiposEvaluacion = tiposRes || [];
      this.grupos = gruposRes || [];

      if (!this.esAdmin && this.grupos.length === 0) {
        this.sesiones = [];
      } else {
        const grupoIds = this.esAdmin ? undefined : this.grupos.map(g => g.id);
        const peticionesSesiones = (grupoIds && grupoIds.length > 0) 
          ? Promise.all(grupoIds.map((id: number) => this.kineSesionService.listarSesiones({ grupoId: id, limite: 1000 })))
          : this.kineSesionService.listarSesiones({ limite: 1000 });

        const sesionesResponse = await peticionesSesiones;
        
        let regs: any[] = [];
        if (Array.isArray(sesionesResponse)) {
            regs = sesionesResponse.flatMap(res => res.registros || []);
        } else {
            regs = (sesionesResponse as any).registros || [];
        }

        this.sesiones = regs.map((s: any) => ({
          ...s,
          tipoObj: this.tiposEvaluacion.find(t => t.id === (s.tipo_evaluacion_id || s.tipoEvaluacionId)) || { nombre: 'Desconocido' },
          grupoObj: this.grupos.find(g => g.id === (s.grupo_id || s.grupoId)) || { nombre: 'Desconocido' }
        }));
      }

      this.aplicarFiltros();
    } catch (error) {
      this.mostrarError('Error al cargar datos principales.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // LOGÍSTICA DE SESIONES (ADMIN Y STAFF)
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = {
      id: null, fecha: new Date(), grupo_id: null, tipo_evaluacion_id: null, estado: EstadoSesion.PROGRAMADA, observacion: ''
    };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    let fechaObj = new Date();
    if (sesion.fecha) {
        const fechaStr = (sesion.fecha as string).split('T')[0];
        const parts = fechaStr.split('-');
        if (parts.length === 3) fechaObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    
    this.evalLogistica = { 
      ...sesion,
      fecha: fechaObj,
      grupo_id: sesion.grupo_id || sesion.grupoId,
      tipo_evaluacion_id: sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId,
      estado: sesion.estado,
      observacion: sesion.observacion || ''
    };
    this.displayMainDialog = true;
  }

  async guardarSesionLogistica() {
    if (this.guardando) return;
    
    if (!this.evalLogistica.fecha || !this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();
    
    const payload = {
      tipoEvaluacionId: this.evalLogistica.tipo_evaluacion_id,
      grupoId: this.evalLogistica.grupo_id,
      fecha: this.formatearFechaIso(this.evalLogistica.fecha),
      observacion: this.evalLogistica.observacion
    };

    try {
      if (this.evalLogistica.id) {
        // 🔥 Promesas Nativas
        await this.kineSesionService.actualizarSesion(this.evalLogistica.id, payload);
        if (this.evalLogistica.estado) {
          await this.kineSesionService.cambiarEstado(this.evalLogistica.id, { estado: this.evalLogistica.estado });
        }
        this.mostrarExito('Sesión actualizada correctamente');
      } else {
        await this.kineSesionService.crearSesion(payload as any);
        this.mostrarExito('Sesión creada correctamente');
      }
      this.displayMainDialog = false;
      await this.cargarDatosGenerales();
    } catch (err: any) {
      let msg = 'Error al guardar la sesión';
      if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
      this.mostrarError(msg);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  confirmarEliminarSesion(sesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la sesión de "${sesion.tipoObj?.nombre}"? Se borrarán las mediciones.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.loading = true;
        this.cdr.detectChanges();
        
        try {
          await this.kineSesionService.eliminarSesion(sesion.id);
          this.mostrarExito('Sesión eliminada correctamente');
          await this.cargarDatosGenerales();
        } catch (error) {
          this.mostrarError('Hubo un error al eliminar la sesión');
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // CALIFICACIÓN INTERACTIVA (STAFF)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    this.estudianteSeleccionado = null;
    this.loading = true;
    this.cdr.detectChanges();

    const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;
    const tipoEvalId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

    try {
      const [alumnosRes, subevaluaciones, resultadosPrevios] = await Promise.all([
        this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, grupoIds: [grupoIdToFetch], limite: 2000, activo: true }),
        this.kineSubevaluacionService.listarSubevaluacionesPorTipo(tipoEvalId),
        this.kineResultadoService.listarResultadosPorSesion(sesion.id)
      ]);

      const alumnosBD = (alumnosRes as any)?.registros || [];

      // Construir la matriz de alumnos y sus subevaluaciones
      this.estudiantesGrupo = alumnosBD.map((est: any) => {
        const idUsuario = est.id_usuario || est.id;
        const nombre = est.nombre;
        const apellido = est.apellido;

        // Filtrar resultados de este usuario
        const resultadosUsuario = (resultadosPrevios || []).filter((r: any) => r.estudiante_id === idUsuario || r.estudianteId === idUsuario);
        let evaluado = false;

        const parametrosMapeados = subevaluaciones.map((sub: any) => {
            const nota: any = resultadosUsuario.find((r: any) => (r.subevaluacion_id || r.subevaluacionId) === sub.id);
            if (nota) evaluado = true;

            return {
                resultado_id: nota ? nota.id : null,
                subevaluacion_id: sub.id,
                nombre_parametro: sub.nombre,
                evalua_lados: sub.evalua_lados,
                prioridad: sub.prioridad,
                resultado_unico: nota && nota.resultado_unico !== null ? Number(nota.resultado_unico) : null,
                resultado_izquierdo: nota && nota.resultado_izquierdo !== null ? Number(nota.resultado_izquierdo) : null,
                resultado_derecho: nota && nota.resultado_derecho !== null ? Number(nota.resultado_derecho) : null,
                observacion: nota ? nota.observacion : '',
                rango: nota ? nota.rango : null
            };
        });

        return {
          id: idUsuario,
          nombre: nombre,
          apellido: apellido,
          activoEnGrupo: true,
          evaluado: evaluado,
          evaluaciones: parametrosMapeados
        };
      });

      // Agregar alumnos inactivos o retirados que tengan nota
      const idsProcesados = new Set(this.estudiantesGrupo.map(e => e.id));
      const alumnosConNotasAntiguas = new Set();
      
      resultadosPrevios.forEach((r: any) => {
          const idUsuario = r.estudiante_id || r.estudianteId;
          if (!idsProcesados.has(idUsuario) && !alumnosConNotasAntiguas.has(idUsuario)) {
              alumnosConNotasAntiguas.add(idUsuario);
              
              const resultadosUsuario = resultadosPrevios.filter((nota: any) => (nota.estudiante_id || nota.estudianteId) === idUsuario);
              const parametrosMapeados = subevaluaciones.map((sub: any) => {
                  const nota: any = resultadosUsuario.find((nota: any) => (nota.subevaluacion_id || nota.subevaluacionId) === sub.id);
                  return {
                      resultado_id: nota ? nota.id : null,
                      subevaluacion_id: sub.id,
                      nombre_parametro: sub.nombre,
                      evalua_lados: sub.evalua_lados,
                      resultado_unico: nota && nota.resultado_unico !== null ? Number(nota.resultado_unico) : null,
                      resultado_izquierdo: nota && nota.resultado_izquierdo !== null ? Number(nota.resultado_izquierdo) : null,
                      resultado_derecho: nota && nota.resultado_derecho !== null ? Number(nota.resultado_derecho) : null,
                      observacion: nota ? nota.observacion : '',
                      rango: nota ? nota.rango : null
                  };
              });

              this.estudiantesGrupo.push({
                  id: idUsuario,
                  nombre: r.alumno?.nombre || 'Desconocido',
                  apellido: r.alumno?.apellido || '',
                  activoEnGrupo: false,
                  evaluado: true,
                  evaluaciones: parametrosMapeados
              });
          }
      });

      if (this.estudiantesGrupo.length > 0) this.estudianteSeleccionado = this.estudiantesGrupo[0];
      this.displayGradesDialog = true;
    } catch (error) {
      this.mostrarError('Error al cargar la matriz de calificaciones.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  limpiarFila(sub: any) {
    if (this.guardando) return;
    sub.resultado_unico = null;
    sub.resultado_izquierdo = null;
    sub.resultado_derecho = null;
    sub.observacion = '';
    sub.rango = null;
    this.cdr.detectChanges();
  }

  actualizarEstadoEstudiante(estudiante: any) {
    if (!estudiante) return;
    estudiante.evaluado = estudiante.evaluaciones.some((sub: any) => 
        sub.resultado_unico !== null || sub.resultado_izquierdo !== null || sub.resultado_derecho !== null
    );
  }

  async guardarNotasFinales() {
    if (this.guardando) return;
    this.guardando = true;
    this.cdr.detectChanges();

    const peticiones: Promise<any>[] = [];

    this.estudiantesGrupo.forEach(est => {
      est.evaluaciones.forEach((sub: any) => {
          const tieneDataNueva = sub.resultado_unico !== null || sub.resultado_izquierdo !== null || sub.resultado_derecho !== null || (sub.observacion && sub.observacion.trim() !== '');
          const esActualizacion = sub.resultado_id !== null;

          if (tieneDataNueva || esActualizacion) {
              const payload: any = {
                  resultadoUnico: sub.resultado_unico?.toString(),
                  resultadoIzquierdo: sub.resultado_izquierdo?.toString(),
                  resultadoDerecho: sub.resultado_derecho?.toString(),
                  observacion: sub.observacion || ''
              };

              if (esActualizacion) {
                  peticiones.push(this.kineResultadoService.actualizarResultado(sub.resultado_id, payload));
              } else if (tieneDataNueva) {
                  payload.sesionId = this.evalLogistica.id;
                  payload.estudianteId = est.id;
                  payload.subevaluacionId = sub.subevaluacion_id;
                  peticiones.push(this.kineResultadoService.crearResultado(payload));
              }
          }
      });
    });

    if (peticiones.length === 0) {
      this.mostrarExito('No se detectaron cambios, todo está guardado.');
      this.guardando = false;
      this.displayGradesDialog = false;
      return;
    }

    this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Procesando matriz de resultados...` });

    try {
      await Promise.all(peticiones);
      this.mostrarExito('Todos los resultados se guardaron y sincronizaron correctamente.');
      this.displayGradesDialog = false;
    } catch (error) {
      this.mostrarError('Ocurrió un error al guardar la matriz. Es posible que algunas subevaluaciones queden incompletas.');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // VISTA DE RESULTADOS (MODO LECTURA / ESTUDIANTE)
  // ==========================================
  async cargarSesionesDelEstudiante() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const res = await this.kineResultadoService.listarMisResultados();
      
      const resultadosPlanos = res || [];
      const sesionesMap = new Map();

      resultadosPlanos.forEach((r: any) => {
        if (!sesionesMap.has(r.sesion_id)) {
            sesionesMap.set(r.sesion_id, {
                id: r.sesion_id,
                fecha: r.created_at, 
                tipo_evaluacion: { nombre: r.subevaluacion?.nombre.split(' - ')[0] || 'Evaluación' }, 
                resultadosRAW: []
            });
        }
        sesionesMap.get(r.sesion_id).resultadosRAW.push(r);
      });

      this.sesiones = Array.from(sesionesMap.values()).map(s => {
          const registroMasAntiguo = s.resultadosRAW.reduce((min: any, p: any) => new Date(p.created_at) < new Date(min.created_at) ? p : min, s.resultadosRAW[0]);
          s.fecha = registroMasAntiguo.created_at;
          return s;
      });

      this.sesiones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    } catch (error) {
      this.mostrarError('Error al cargar tu historial de evaluaciones físicas.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async verResultados(sesion: any) {
    this.sesionVista = sesion;
    this.resultadosVista = [];
    this.estudianteVistaSeleccionado = null;
    this.displayViewDialog = true;
    this.cargandoResultados = true;
    this.cdr.detectChanges();

    try {
      if (this.esEstudiante) {
        const resultadosAlumno = sesion.resultadosRAW.map((r: any) => ({
            nombre_parametro: r.subevaluacion?.nombre || 'Parámetro',
            resultado_unico: r.resultado_unico !== null ? r.resultado_unico : null,
            resultado_izquierdo: r.resultado_izquierdo !== null ? r.resultado_izquierdo : null,
            resultado_derecho: r.resultado_derecho !== null ? r.resultado_derecho : null,
            observacion: r.observacion || '',
            rango: r.rango || null
        }));

        this.resultadosVista = [{
            id: 'me',
            nombre: 'Yo',
            apellido: '',
            activoEnGrupo: true,
            evaluaciones: resultadosAlumno
        }];
        this.estudianteVistaSeleccionado = this.resultadosVista[0];
      } else {
        const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;
        const tipoEvalId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

        const [alumnosRes, subevaluaciones, resultadosPrevios] = await Promise.all([
          this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, grupoIds: [grupoIdToFetch], limite: 2000, activo: true }),
          this.kineSubevaluacionService.listarSubevaluacionesPorTipo(tipoEvalId),
          this.kineResultadoService.listarResultadosPorSesion(sesion.id)
        ]);

        const alumnosBD = (alumnosRes as any)?.registros || [];
        const resultadosValidos = (resultadosPrevios || []).filter((r: any) => r.resultado_unico !== null || r.resultado_izquierdo !== null || r.resultado_derecho !== null || r.observacion);

        this.resultadosVista = alumnosBD.map((est: any) => {
            const idUsuario = est.id_usuario || est.id;
            const resultadosUsuario = resultadosValidos.filter((r: any) => r.estudiante_id === idUsuario || r.estudianteId === idUsuario);

            const parametrosMapeados = subevaluaciones.map((sub: any) => {
                const nota: any = resultadosUsuario.find((r: any) => (r.subevaluacion_id || r.subevaluacionId) === sub.id);
                return {
                    nombre_parametro: sub.nombre,
                    evalua_lados: sub.evalua_lados,
                    resultado_unico: nota ? nota.resultado_unico : null,
                    resultado_izquierdo: nota ? nota.resultado_izquierdo : null,
                    resultado_derecho: nota ? nota.resultado_derecho : null,
                    observacion: nota ? nota.observacion : '',
                    rango: nota ? nota.rango : null
                };
            });

            return {
                id: idUsuario,
                nombre: est.nombre,
                apellido: est.apellido,
                activoEnGrupo: true,
                evaluaciones: parametrosMapeados
            };
        });

        // Filtrar para mostrar solo a los que tienen al menos 1 nota
        this.resultadosVista = this.resultadosVista.filter(est => est.evaluaciones.some((sub: any) => sub.resultado_unico !== null || sub.resultado_izquierdo !== null || sub.resultado_derecho !== null));

        if (this.resultadosVista.length > 0) this.estudianteVistaSeleccionado = this.resultadosVista[0];
      }
    } catch (error) {
      this.mostrarError('Error al construir el visor de resultados.');
    } finally {
      this.cargandoResultados = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // EXPORTAR EXCEL
  // ==========================================
  descargarExcelPorSesion(sesion: any) {
    if (!sesion || !sesion.id) return;
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando matriz en Excel...' });
    this.excelService.exportarResultadosKine(sesion.id);
  }

  // ==========================================
  // HELPERS VISUALES Y DE FILTRADO
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let f = true, g = true, p = true, e = true;
      if (this.filtroFecha) f = (s.fecha || '').substring(0, 10) === this.formatearFechaIso(this.filtroFecha);
      if (this.filtroGrupo) g = (s.grupo_id || s.grupoId) === this.filtroGrupo.id;
      if (this.filtroPrueba) p = (s.tipo_evaluacion_id || s.tipoEvaluacionId) === this.filtroPrueba;
      if (this.filtroEstado) e = s.estado === this.filtroEstado;
      return f && g && p && e;
    });
    this.cdr.detectChanges();
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
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        const tzOffset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
    } catch {
        return '';
    }
  }

  getSeverityPuntaje(valor: any, subId: number): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return valor ? 'info' : 'secondary';
  }

  getEstiloColorRango(color: string | null): any {
    if (!color) return {};
    return {
        'background-color': color,
        'color': '#ffffff',
        'border': `1px solid ${color}`
    };
  }

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }
}