import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

// Enum
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

// Importaciones de PrimeNG
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
import { NutriTipoEvaluacionService } from '../../../../core/domains/salud/nutricion/tipos/services/tipo-evaluacion.service';
import { NutriSesionService } from '../../../../core/domains/salud/nutricion/sesiones/services/sesion.service';
import { NutriResultadoService } from '../../../../core/domains/salud/nutricion/resultados/services/resultado.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-nutri-evaluaciones-nutri',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, InputTextModule, ToastModule, 
    ConfirmDialogModule, RadioButtonModule, TooltipModule, ProgressSpinnerModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones-nutri.component.html',
  styleUrls: ['./evaluaciones-nutri.component.css']
})
export class NutriEvaluationsComponent implements OnInit {
  
  // ✅ Exponemos el Enum al HTML
  readonly EstadoSesion = EstadoSesion;

  // Inyección de Servicios
  private nutriTipoService = inject(NutriTipoEvaluacionService);
  private nutriSesionService = inject(NutriSesionService);
  private nutriResultadoService = inject(NutriResultadoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef); 

  // Datos
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];

  // Filtros
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;
  filtroEstado: EstadoSesion | null = null;
  
  opcionesEstadoFiltro = [
    { label: 'Pendientes', value: EstadoSesion.PROGRAMADA },
    { label: 'Finalizadas', value: EstadoSesion.FINALIZADA }
  ];

  // Modales y Estado
  displayMainDialog = false;
  displayGradesDialog = false;
  loading = false;
  guardando = false;

  // Objeto para crear/editar evaluación
  evalLogistica: any = {};

  ngOnInit() {
    this.cargarDatosBase();
  }

  // ==========================================
  // CARGA DE DATOS PRINCIPALES
  // ==========================================
  cargarDatosBase() {
    this.loading = true;

    forkJoin({
      tipos: this.nutriTipoService.listarTiposEvaluacion(),
      sesiones: this.nutriSesionService.listarSesiones({ limite: 1000 })
    }).subscribe({
      next: (data) => {
        this.tiposEvaluacion = data.tipos || [];
        
        // Mapeamos las sesiones de este nutricionista
        const regs = data.sesiones.registros || [];
        this.sesiones = regs.map((s: any) => ({
          ...s,
          tipoObj: this.tiposEvaluacion.find(t => t.id === (s.tipo_evaluacion_id || s.tipoEvaluacionId)) || { nombre: 'Desconocido' }
        }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges(); 
      },
      error: () => {
        this.mostrarError('No se pudieron cargar los datos base.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // FILTROS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let cumpleFecha = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      const tId = s.tipo_evaluacion_id || s.tipoEvaluacionId;

      if (this.filtroFecha) {
        const dFiltro = this.formatearFechaIso(this.filtroFecha);
        cumpleFecha = (s.fecha || '').substring(0, 10) === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = tId === this.filtroPrueba.id;
      }
      if (this.filtroEstado) {
        cumpleEstado = s.estado === this.filtroEstado;
      }

      return cumpleFecha && cumplePrueba && cumpleEstado;
    });
    this.cdr.detectChanges(); 
  }

  limpiarFiltros() {
    this.filtroFecha = null;
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

  // ==========================================
  // LOGÍSTICA DE SESIONES
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = {
      id: null,
      fecha: new Date(),
      tipo_id: null,
      estado: EstadoSesion.PROGRAMADA
    };
    this.displayMainDialog = true;
    this.cdr.detectChanges(); 
  }

  editarSesion(sesion: any) {
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { 
      ...sesion,
      tipo_id: sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId,
      fecha: fechaObj
    };
    this.displayMainDialog = true;
    this.cdr.detectChanges(); 
  }

  guardarSesionPlanificada() {
    if (!this.evalLogistica.fecha || !this.evalLogistica.tipo_id) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    this.loading = true;
    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    
    // 💡 El backend ya sabe quién es el nutricionista por su JWT, no es necesario enviarlo
    const payload = {
      tipoId: this.evalLogistica.tipo_id,
      fecha: fechaSeleccionada.toISOString().split('T')[0],
      estado: this.evalLogistica.estado || EstadoSesion.PROGRAMADA
    };

    const peticion$ = this.evalLogistica.id 
      ? this.nutriSesionService.actualizarSesion(this.evalLogistica.id, payload as any)
      : this.nutriSesionService.crearSesion(payload as any);

    peticion$.subscribe({
      next: () => {
        this.mostrarExito(this.evalLogistica.id ? 'Sesión actualizada' : 'Sesión creada');
        this.displayMainDialog = false;
        this.cargarDatosBase();
      },
      error: () => {
        this.mostrarError('Error al guardar la sesión');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // REGISTRAR RESULTADOS (PDFs)
  // ==========================================
  abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    this.loading = true;

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
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.mostrarError('Formato inválido. Por favor, sube únicamente archivos PDF.');
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
    estudiante.archivoSeleccionado = null;
    estudiante.observacion = '';
    if(fileInput) fileInput.value = ''; 
    this.cdr.detectChanges(); 
  }

  guardarNotasFinales() {
    const porGuardar = this.estudiantes.filter(e => e.archivoSeleccionado || (e.resultado_id && e.observacion !== undefined));

    if (porGuardar.length === 0) {
      this.mostrarError('No has adjuntado ningún archivo ni observación nueva para guardar.');
      return;
    }

    this.guardando = true;
    this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Subiendo ${porGuardar.length} resultados...` });

    const peticiones = porGuardar.map(est => {
      const payload = {
        evaluacionId: this.evalLogistica.id,
        estudianteId: est.id,
        observaciones: est.observacion || ''
      };

      // FormData se maneja automáticamente en el NutriResultadoService ✨
      if (est.resultado_id) {
        return this.nutriResultadoService.actualizarResultado(est.resultado_id, payload, est.archivoSeleccionado);
      } else {
        return this.nutriResultadoService.crearResultado(payload, est.archivoSeleccionado);
      }
    });

    forkJoin(peticiones).subscribe({
      next: () => {
        this.mostrarExito('Todos los resultados se guardaron correctamente');
        this.displayGradesDialog = false;
        this.guardando = false;
        this.cargarDatosBase();
      },
      error: () => {
        this.mostrarError('Ocurrió un error al subir los archivos.');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  mostrarExito(mensaje: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
  }
  
  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}