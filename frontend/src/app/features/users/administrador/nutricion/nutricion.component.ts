import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of, switchMap } from 'rxjs'; // 🔥 Agregado switchMap

// Enum
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

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

// Nuevos Servicios de Dominio
import { NutriTipoEvaluacionService } from '../../../../core/domains/salud/nutricion/tipos/services/tipo-evaluacion.service';
import { NutriSesionService } from '../../../../core/domains/salud/nutricion/sesiones/services/sesion.service';
import { NutriResultadoService } from '../../../../core/domains/salud/nutricion/resultados/services/resultado.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';

@Component({
  selector: 'app-administrador-nutricion',
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
export class AdminNutriComponent implements OnInit {
  
  readonly EstadoSesion = EstadoSesion;

  private nutriTipoService = inject(NutriTipoEvaluacionService);
  private nutriSesionService = inject(NutriSesionService);
  private nutriResultadoService = inject(NutriResultadoService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService); 
  private cdr = inject(ChangeDetectorRef);

  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];
  nutricionistas: any[] = []; 

  filtroFecha: Date | null = null;
  filtroPrueba: any = null;
  filtroEstado: EstadoSesion | null = null;
  
  opcionesEstadoFiltro = [
    { label: 'Pendientes', value: EstadoSesion.PROGRAMADA },
    { label: 'Finalizadas', value: EstadoSesion.FINALIZADA }
  ];

  displayMainDialog = false;
  displayGradesDialog = false;
  displayTiposDialog = false;
  
  loading = false;
  guardando = false;

  evalLogistica: any = {};
  nuevoTipo = { nombre: '', descripcion: '' };

  ngOnInit() {
    this.cargarDatosBase();
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  cargarDatosBase() {
    this.loading = true;
    this.cdr.detectChanges();

    const nutricionistasReq: Observable<any[]> = (this.usuarioService as any).listarNutricionistas 
      ? (this.usuarioService as any).listarNutricionistas() 
      : of([]);

    forkJoin({
      tipos: this.nutriTipoService.listarTiposEvaluacion(),
      nutris: nutricionistasReq,
      sesiones: this.nutriSesionService.listarSesiones({ limite: 1000 })
    }).subscribe({
      next: (data) => {
        this.tiposEvaluacion = data.tipos || [];
        this.nutricionistas = (data.nutris || []).map((n: any) => ({
          ...n,
          nombreCompleto: `${n.nombre} ${n.apellido}`
        }));
        
        const regs = data.sesiones.registros || [];
        this.sesiones = regs.map((s: any) => ({
          ...s,
          // FIX: Mapeo exacto con tipo_id y nutricionista_id
          tipoObj: this.tiposEvaluacion.find(t => t.id === s.tipo_id) || { nombre: 'Desconocido' },
          nutriObj: this.nutricionistas.find(n => n.id === s.nutricionista_id) || { nombreCompleto: 'No asignado' }
        }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar datos principales.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // GESTIÓN DE TIPOS (CONFIGURACIÓN)
  // ==========================================
  abrirConfiguracionTipos() {
    this.nuevoTipo = { nombre: '', descripcion: '' };
    this.displayTiposDialog = true;
  }

  guardarNuevoTipo() {
    if (this.guardando) return;
    if (!this.nuevoTipo.nombre) return;
    
    this.guardando = true;
    this.cdr.detectChanges();
    
    this.nutriTipoService.crearTipoEvaluacion(this.nuevoTipo).subscribe({
      next: () => {
        this.mostrarExito('Test agregado correctamente');
        this.nuevoTipo = { nombre: '', descripcion: '' };
        
        this.nutriTipoService.listarTiposEvaluacion().subscribe(res => {
          this.tiposEvaluacion = res || [];
          this.guardando = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.mostrarError('Error al guardar el tipo de test');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminarTipo(tipo: any) {
    this.confirmationService.confirm({
      message: `¿Seguro que deseas eliminar el test "${tipo.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.guardando = true;
        this.cdr.detectChanges();
        
        this.nutriTipoService.eliminarTipoEvaluacion(tipo.id).subscribe({
          next: () => {
            this.mostrarExito('Test eliminado correctamente');
            this.nutriTipoService.listarTiposEvaluacion().subscribe(res => {
              this.tiposEvaluacion = res || [];
              this.guardando = false;
              this.cdr.detectChanges();
            });
          },
          error: (err) => {
            if (err?.error?.message?.includes('violates foreign key') || err?.error?.statusCode === 500) {
              this.mostrarError('No se puede eliminar porque ya hay sesiones usando este test.');
            } else {
              this.mostrarError('Hubo un error al eliminar el test');
            }
            this.guardando = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // ==========================================
  // GESTIÓN DE SESIONES (LOGÍSTICA)
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
        const parts = (sesion.fecha as string).split('-');
        if (parts.length === 3) fechaObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    
    this.evalLogistica = { 
      ...sesion,
      fecha: fechaObj,
      tipo_id: sesion.tipo_id,
      nutricionista_id: sesion.nutricionista_id
    };
    this.displayMainDialog = true;
  }

  guardarSesionPlanificada() {
    if (this.guardando) return;
    if (!this.evalLogistica.fecha || !this.evalLogistica.tipo_id || !this.evalLogistica.nutricionista_id) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();
    
    // Payload compatible con Crear y Actualizar
    const payload = {
      tipoId: this.evalLogistica.tipo_id,
      nutricionistaId: this.evalLogistica.nutricionista_id,
      fecha: this.formatearFechaIso(this.evalLogistica.fecha)
    };

    if (this.evalLogistica.id) {
      // FIX: Modo Edición -> Actualiza logística y luego el estado
      this.nutriSesionService.actualizarSesion(this.evalLogistica.id, payload).pipe(
        switchMap(() => {
          if (this.evalLogistica.estado) {
            return this.nutriSesionService.cambiarEstado(this.evalLogistica.id, { estado: this.evalLogistica.estado });
          }
          return of(null);
        })
      ).subscribe({
        next: () => {
          this.mostrarExito('Sesión actualizada correctamente');
          this.displayMainDialog = false;
          this.guardando = false;
          this.cargarDatosBase();
        },
        error: () => {
          this.mostrarError('Error al actualizar la sesión');
          this.guardando = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Modo Creación
      this.nutriSesionService.crearSesion(payload as any).subscribe({
        next: () => {
          this.mostrarExito('Sesión creada correctamente');
          this.displayMainDialog = false;
          this.guardando = false;
          this.cargarDatosBase();
        },
        error: () => {
          this.mostrarError('Error al crear la sesión');
          this.guardando = false;
          this.cdr.detectChanges();
        }
      });
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
      accept: () => {
        this.guardando = true;
        this.cdr.detectChanges();
        
        this.nutriSesionService.eliminarSesion(sesion.id).subscribe({
          next: () => {
            this.mostrarExito('Sesión eliminada correctamente');
            this.guardando = false;
            this.cargarDatosBase();
          },
          error: () => {
            this.mostrarError('Hubo un error al eliminar la sesión');
            this.guardando = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // ==========================================
  // CALIFICACIÓN Y ARCHIVOS
  // ==========================================
  abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }),
      resultados: this.nutriResultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: (res) => {
        const alumnosBD = res.alumnos.registros || [];
        const resultadosPrevios = res.resultados || [];

        this.estudiantes = alumnosBD.map((est: any) => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id || est.id;
          const nombre = est.perfil ? est.perfil.nombre : est.nombre;
          const apellido = est.perfil ? est.perfil.apellido : est.apellido;

          const resultadoGuardado: any = resultadosPrevios.find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);

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
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar alumnos y resultados.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

  guardarNotasFinales() {
    if (this.guardando) return;
    
    const porGuardar = this.estudiantes.filter(e => e.archivoSeleccionado || (e.resultado_id && e.observacion !== undefined));
    if (porGuardar.length === 0) {
      this.mostrarError('No hay archivos nuevos ni modificaciones para guardar.');
      return;
    }

    this.guardando = true;
    this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Procesando ${porGuardar.length} resultados...` });
    this.cdr.detectChanges();

    const peticiones = porGuardar.map(est => {
      const payload = {
        evaluacionId: this.evalLogistica.id,
        estudianteId: est.id,
        observaciones: est.observacion || ''
      };

      if (est.resultado_id) {
        return this.nutriResultadoService.actualizarResultado(est.resultado_id, payload, est.archivoSeleccionado);
      } else {
        return this.nutriResultadoService.crearResultado(payload, est.archivoSeleccionado);
      }
    });

    forkJoin(peticiones).subscribe({
      next: () => {
        this.mostrarExito('Resultados guardados correctamente');
        this.displayGradesDialog = false;
        this.guardando = false;
        this.cargarDatosBase();
      },
      error: () => {
        this.mostrarError('Ocurrió un error al subir los archivos. Revisa el tamaño (max 5MB).');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // HELPERS Y FILTROS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let f = true, p = true, e = true;
      const tId = s.tipo_id; // FIX: Uso correcto

      if (this.filtroFecha) f = (s.fecha || '').substring(0, 10) === this.formatearFechaIso(this.filtroFecha);
      if (this.filtroPrueba) p = tId === this.filtroPrueba.id;
      if (this.filtroEstado) e = s.estado === this.filtroEstado;
      return f && p && e;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
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

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }
}