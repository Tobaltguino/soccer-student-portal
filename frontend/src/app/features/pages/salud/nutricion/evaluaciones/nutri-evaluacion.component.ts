import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs'; // 🔥 IMPORTADO

// Enum
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
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';

// Servicios de Dominio
import { AuthService } from '../../../../../core/auth/auth.service';
import { NutriTipoEvaluacionService } from '../../../../../core/domains/salud/nutricion/evaluaciones/tipos/services/tipo-evaluacion.service';
import { NutriSesionService } from '../../../../../core/domains/salud/nutricion/evaluaciones/sesiones/services/sesion.service';
import { NutriResultadoService } from '../../../../../core/domains/salud/nutricion/evaluaciones/resultados/services/resultado.service';
import { EstudianteService } from '../../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../../core/domains/usuarios/central/services/usuario.service';

@Component({
  selector: 'app-nutricion',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, InputTextModule, ToastModule, 
    ConfirmDialogModule, RadioButtonModule, TooltipModule, ProgressSpinnerModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './nutricion.component.html',
  styleUrls: ['./nutricion.component.scss']
})
export class NutricionComponent implements OnInit {
  
  readonly EstadoSesion = EstadoSesion;

  private authService = inject(AuthService);
  private nutriTipoService = inject(NutriTipoEvaluacionService);
  private nutriSesionService = inject(NutriSesionService);
  private nutriResultadoService = inject(NutriResultadoService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService); 
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false; // Nutricionista
  esEstudiante: boolean = false;

  // Datos Gestión
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];
  nutricionistas: any[] = []; 

  // Datos Estudiante
  misResultados: any[] = [];
  misResultadosFiltrados: any[] = [];
  tiposEvaluacionEstudiante: any[] = []; 

  // Filtros
  filtroFecha: Date | null = null;
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
  displayGradesDialog = false;
  displayTiposDialog = false; // Solo Admin
  
  loading = false;
  guardando = false;

  evalLogistica: any = {};
  nuevoTipo = { nombre: '', descripcion: '' };

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
      this.esStaff = this.rolActual === 'nutricionista';

      if (this.esEstudiante) {
        await this.cargarResultadosEstudiante();
      } else {
        await this.cargarDatosGestion();
      }
    } catch (error) {
      this.mostrarError('Error inicializando módulo de nutrición.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (GESTIÓN)
  // ==========================================
  async cargarDatosGestion() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const [tiposRes, nutrisRes, sesionesRes] = await Promise.all([
        firstValueFrom(this.nutriTipoService.listarTiposEvaluacion()),
        firstValueFrom(this.usuarioService.listarUsuarios({ rol: Rol.NUTRICIONISTA, limite: 1000 })),
        firstValueFrom(this.nutriSesionService.listarSesiones({ limite: 1000 }))
      ]);

      this.tiposEvaluacion = tiposRes || [];
      
      this.nutricionistas = (nutrisRes.registros || []).map((n: any) => ({
        ...n,
        id_usuario: n.id_usuario || n.id,
        nombreCompleto: `${n.nombre} ${n.apellido}`
      }));
      
      const regs = sesionesRes?.registros || [];
      this.sesiones = regs.map((s: any) => {
        const tipoId = s.tipo_id || s.tipoId;
        const nutriId = s.nutricionista_id || s.nutricionistaId;

        return {
          ...s,
          tipo_id: tipoId,
          nutricionista_id: nutriId,
          tipoObj: this.tiposEvaluacion.find(t => t.id === tipoId) || { nombre: 'Desconocido' },
          nutriObj: this.nutricionistas.find(n => n.id_usuario === nutriId) || { nombreCompleto: 'No asignado' }
        };
      });

      this.aplicarFiltrosGestion();
    } catch (error) {
      this.mostrarError('Error al cargar datos principales.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // GESTIÓN DE TIPOS (SOLO ADMIN)
  // ==========================================
  abrirConfiguracionTipos() {
    this.nuevoTipo = { nombre: '', descripcion: '' };
    this.displayTiposDialog = true;
  }

  async guardarNuevoTipo() {
    if (this.guardando) return;
    if (!this.nuevoTipo.nombre) return;
    
    this.guardando = true;
    this.cdr.detectChanges();
    
    try {
      await firstValueFrom(this.nutriTipoService.crearTipoEvaluacion(this.nuevoTipo));
      this.mostrarExito('Test agregado correctamente');
      this.nuevoTipo = { nombre: '', descripcion: '' };
      
      this.tiposEvaluacion = await firstValueFrom(this.nutriTipoService.listarTiposEvaluacion()) || [];
    } catch (error) {
      this.mostrarError('Error al guardar el tipo de test');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  eliminarTipo(tipo: any) {
    this.confirmationService.confirm({
      message: `¿Seguro que deseas eliminar el test "${tipo.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.guardando = true;
        this.cdr.detectChanges();
        
        try {
          await firstValueFrom(this.nutriTipoService.eliminarTipoEvaluacion(tipo.id));
          this.mostrarExito('Test eliminado correctamente');
          this.tiposEvaluacion = await firstValueFrom(this.nutriTipoService.listarTiposEvaluacion()) || [];
        } catch (err: any) {
          if (err?.error?.message?.includes('violates foreign key') || err?.error?.statusCode === 500) {
            this.mostrarError('No se puede eliminar porque ya hay sesiones usando este test.');
          } else {
            this.mostrarError('Hubo un error al eliminar el test');
          }
        } finally {
          this.guardando = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // LOGÍSTICA DE SESIONES (ADMIN Y STAFF)
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = {
      id: null, fecha: new Date(), tipo_id: null, nutricionista_id: null, estado: EstadoSesion.PROGRAMADA
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
      tipo_id: sesion.tipo_id,
      nutricionista_id: sesion.nutricionista_id,
      estado: sesion.estado
    };
    this.displayMainDialog = true;
  }

  async guardarSesionPlanificada() {
    if (this.guardando) return;
    
    // El admin puede asignar, el staff se autoasigna si omitimos, pero exigiremos que el campo exista.
    if (!this.evalLogistica.fecha || !this.evalLogistica.tipo_id || (this.esAdmin && !this.evalLogistica.nutricionista_id)) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();
    
    const payload = {
      tipoId: this.evalLogistica.tipo_id,
      nutricionistaId: this.esAdmin ? this.evalLogistica.nutricionista_id : undefined, // Si es nutri, asume su propio token en backend
      fecha: this.formatearFechaIso(this.evalLogistica.fecha)
    };

    try {
      if (this.evalLogistica.id) {
        await firstValueFrom(this.nutriSesionService.actualizarSesion(this.evalLogistica.id, payload));
        if (this.evalLogistica.estado) {
          await firstValueFrom(this.nutriSesionService.cambiarEstado(this.evalLogistica.id, { estado: this.evalLogistica.estado }));
        }
        this.mostrarExito('Sesión actualizada correctamente');
      } else {
        await firstValueFrom(this.nutriSesionService.crearSesion(payload as any));
        this.mostrarExito('Sesión creada correctamente');
      }
      this.displayMainDialog = false;
      await this.cargarDatosGestion();
    } catch (err: any) {
      let msg = 'Error al procesar la sesión';
      if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
      this.mostrarError(msg);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  eliminarSesion(sesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la sesión "${sesion.tipoObj?.nombre}"? Se perderán todos los archivos adjuntos.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.guardando = true;
        this.cdr.detectChanges();
        
        try {
          await firstValueFrom(this.nutriSesionService.eliminarSesion(sesion.id));
          this.mostrarExito('Sesión eliminada correctamente');
          await this.cargarDatosGestion();
        } catch (error) {
          this.mostrarError('Hubo un error al eliminar la sesión');
        } finally {
          this.guardando = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // CALIFICACIÓN Y ARCHIVOS (ADMIN Y STAFF)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const [alumnosRes, resultadosPrevios] = await Promise.all([
        firstValueFrom(this.estudianteService.listarEstudiantes({ limite: 2000, activo: true })),
        firstValueFrom(this.nutriResultadoService.listarResultadosPorSesion(sesion.id))
      ]);

      const alumnosBD = alumnosRes?.registros || [];

      this.estudiantes = alumnosBD.map((est: any) => {
        const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id || est.id;
        const nombre = est.perfil ? est.perfil.nombre : est.nombre;
        const apellido = est.perfil ? est.perfil.apellido : est.apellido;

        const resultadoGuardado: any = (resultadosPrevios || []).find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);

        const nuevoEst = {
          id: idUsuario,
          nombre: nombre,
          apellido: apellido,
          resultado_id: resultadoGuardado ? resultadoGuardado.id : null,
          archivoSeleccionado: null as File | null, 
          archivo_url_previo: resultadoGuardado ? (resultadoGuardado.archivo_url || resultadoGuardado.archivoUrl) : null,
          nombre_archivo_previo: null as string | null, 
          observacion: resultadoGuardado ? (resultadoGuardado.observaciones || resultadoGuardado.observacion) : ''
        };

        if (nuevoEst.archivo_url_previo) {
          const urlParts = nuevoEst.archivo_url_previo.split('/');
          const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
          const underscoreIndex = rawName.indexOf('_');
          nuevoEst.nombre_archivo_previo = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
        }

        return nuevoEst;
      });

      this.displayGradesDialog = true;
    } catch (error) {
      this.mostrarError('Error al cargar alumnos y resultados.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: any, estudiante: any) {
    if (this.guardando) return;
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.mostrarError('Formato inválido. Sube únicamente archivos PDF.');
        event.target.value = ''; 
        estudiante.archivoSeleccionado = null;
        this.cdr.detectChanges();
        return;
      }
      estudiante.archivoSeleccionado = file;
      this.cdr.detectChanges();
    }
  }

  limpiarFila(estudiante: any, fileInput: any) {
    if (this.guardando) return;
    estudiante.archivoSeleccionado = null;
    estudiante.observacion = '';
    if(fileInput) fileInput.value = ''; 
    this.cdr.detectChanges();
  }

  async guardarNotasFinales() {
    if (this.guardando) return;
    
    const porGuardar = this.estudiantes.filter(e => e.archivoSeleccionado || (e.resultado_id && e.observacion !== undefined));
    if (porGuardar.length === 0) {
      this.mostrarError('No hay archivos nuevos ni modificaciones para guardar.');
      return;
    }

    this.guardando = true;
    this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Procesando ${porGuardar.length} resultados...` });
    this.cdr.detectChanges();

    try {
      const peticiones = porGuardar.map(est => {
        const payload = {
          evaluacionId: this.evalLogistica.id,
          estudianteId: est.id,
          observaciones: est.observacion || ''
        };
  
        if (est.resultado_id) {
          return firstValueFrom(this.nutriResultadoService.actualizarResultado(est.resultado_id, payload, est.archivoSeleccionado));
        } else {
          return firstValueFrom(this.nutriResultadoService.crearResultado(payload, est.archivoSeleccionado));
        }
      });

      await Promise.all(peticiones);
      this.mostrarExito('Resultados guardados correctamente');
      this.displayGradesDialog = false;
      await this.cargarDatosGestion();
    } catch (error) {
      this.mostrarError('Ocurrió un error al subir los archivos. Revisa el tamaño (max 5MB).');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // VISTA ESTUDIANTE
  // ==========================================
  async cargarResultadosEstudiante() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const data = await firstValueFrom(this.nutriResultadoService.listarMisResultados());
      const rawData = data || [];

      this.misResultados = rawData.map((r: any) => {
        const ev = r.evaluacion || {};
        const archivoUrl = r.archivo_url;
        let nombreLimpio = 'Documento PDF';
        
        if (archivoUrl) {
          const urlParts = archivoUrl.split('/');
          const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
          const underscoreIndex = rawName.indexOf('_');
          nombreLimpio = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
        }

        return {
          fecha: ev.fecha,
          tipo_nombre: ev.nombre || 'Evaluación Nutricional',
          observacion: r.observaciones || '',
          archivo_url: archivoUrl,
          nombre_archivo: nombreLimpio
        };
      });

      this.misResultados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const tiposUnicos = new Set(this.misResultados.map(r => r.tipo_nombre));
      this.tiposEvaluacionEstudiante = Array.from(tiposUnicos).map(nombre => ({ nombre }));

      this.aplicarFiltrosEstudiante();
    } catch (error) {
      this.mostrarError('No se pudieron cargar tus pautas nutricionales.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltrosEstudiante() {
    this.misResultadosFiltrados = this.misResultados.filter(r => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const dFiltro = this.formatearFechaIso(this.filtroFecha);
        cumpleFecha = (r.fecha || '').substring(0, 10) === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = r.tipo_nombre === this.filtroPrueba.nombre;
      }

      return cumpleFecha && cumplePrueba;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltrosEstudiante() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.aplicarFiltrosEstudiante();
  }

  // ==========================================
  // HELPERS DE ESTADO Y FILTROS GESTIÓN
  // ==========================================
  aplicarFiltrosGestion() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let f = true, p = true, e = true;
      if (this.filtroFecha) f = (s.fecha || '').substring(0, 10) === this.formatearFechaIso(this.filtroFecha);
      if (this.filtroPrueba) p = s.tipo_id === this.filtroPrueba.id;
      if (this.filtroEstado) e = s.estado === this.filtroEstado;
      return f && p && e;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltrosGestion() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.aplicarFiltrosGestion();
  }

  getNombreEstado(estado: string): string {
    switch (estado) {
      case EstadoSesion.PROGRAMADA: return 'Programada';
      case EstadoSesion.EN_CURSO: return 'En Curso';
      case EstadoSesion.FINALIZADA: return 'Finalizada';
      case EstadoSesion.CANCELADA: return 'Cancelada';
      default: return 'Desconocido';
    }
  }

  getSeverityEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case EstadoSesion.PROGRAMADA: return 'warn';
      case EstadoSesion.EN_CURSO: return 'info';
      case EstadoSesion.FINALIZADA: return 'success';
      case EstadoSesion.CANCELADA: return 'danger';
      default: return 'secondary';
    }
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

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }
}