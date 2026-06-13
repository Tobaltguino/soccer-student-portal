import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { MessageService, ConfirmationService } from 'primeng/api';

import { NutricionService } from '../../../../core/services/modulos/salud/nutri.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-admin-nutri',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, InputTextModule, ToastModule, 
    ConfirmDialogModule, RadioButtonModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-nutri.html',
  styleUrls: ['./admin-nutri.css']
})
export class AdminNutriComponent implements OnInit {
  
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];
  nutricionistas: any[] = []; 

  filtroFecha: Date | null = null;
  filtroPrueba: any = null;
  filtroEstado: string | null = null;
  opcionesEstadoFiltro = [
    { label: 'Pendientes', value: 'PENDIENTE' },
    { label: 'Finalizadas', value: 'FINALIZADO' }
  ];

  displayMainDialog = false;
  displayGradesDialog = false;
  displayTiposDialog = false;
  loading = false;
  guardando = false;

  evalLogistica: any = {};
  nuevoTipo = { nombre: '', descripcion: '' };

  constructor(
    private nutricionService: NutricionService,
    private usuariosService: UsuariosService,
    private storageService: StorageService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService, 
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarDatosBase();
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  async cargarDatosBase() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const [resTipos, resNutris, resEst] = await Promise.all([
        this.nutricionService.getTiposEvaluacionNutri(),
        this.nutricionService.getNutricionistas(),
        this.usuariosService.getEstudiantesBasico()
      ]);

      this.tiposEvaluacion = resTipos.data || [];
      
      this.nutricionistas = (resNutris.data || []).map((n: any) => ({
        id: n.id,
        nombreCompleto: `${n.nombre} ${n.apellido}`
      }));

      this.estudiantes = (resEst.data || []).map((est: any) => ({
        ...est,
        archivoSeleccionado: null,
        archivo_url_previo: null,
        nombre_archivo_previo: null, 
        observacion: ''
      }));

      await this.cargarSesiones();

    } catch (error) {
      this.mostrarError('No se pudieron cargar los datos base.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarSesiones() {
    const res = await this.nutricionService.getEvaluacionesNutri();
    this.sesiones = res.data || [];
    this.aplicarFiltros();
    this.cdr.detectChanges();
  }

  // ==========================================
  // GESTIÓN DE TIPOS (CONFIGURACIÓN)
  // ==========================================
  abrirConfiguracionTipos() {
    this.nuevoTipo = { nombre: '', descripcion: '' };
    this.displayTiposDialog = true;
    this.cdr.detectChanges();
  }

  async guardarNuevoTipo() {
    if (!this.nuevoTipo.nombre) return;
    try {
      this.loading = true;
      await this.nutricionService.crearTipoEvaluacionNutri(this.nuevoTipo);
      this.mostrarExito('Test agregado correctamente');
      this.nuevoTipo = { nombre: '', descripcion: '' };
      
      const res = await this.nutricionService.getTiposEvaluacionNutri();
      this.tiposEvaluacion = res.data || [];
    } catch (error) {
      this.mostrarError('Error al guardar el tipo de test');
    } finally {
      this.loading = false;
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
        try {
          this.loading = true;
          this.cdr.detectChanges();
          await this.nutricionService.eliminarTipoEvaluacionNutri(tipo.id);
          this.mostrarExito('Test eliminado correctamente');
          
          const res = await this.nutricionService.getTiposEvaluacionNutri();
          this.tiposEvaluacion = res.data || [];
        } catch (error: any) {
          if (error.code === '23503') {
            this.mostrarError('No se puede eliminar porque ya hay sesiones usando este test.');
          } else {
            this.mostrarError('Hubo un error al eliminar el test');
          }
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // GESTIÓN DE SESIONES (LOGÍSTICA)
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = {
      id: null, fecha: new Date(), tipo_id: null, nutricionista_id: null, estado: 'PENDIENTE'
    };
    this.displayMainDialog = true;
    this.cdr.detectChanges();
  }

  editarSesion(sesion: any) {
    const [year, month, day] = sesion.fecha.split('-');
    this.evalLogistica = { 
      ...sesion,
      fecha: new Date(year, month - 1, day)
    };
    this.displayMainDialog = true;
    this.cdr.detectChanges();
  }

  async guardarSesionPlanificada() {
    if (!this.evalLogistica.fecha || !this.evalLogistica.tipo_id || !this.evalLogistica.nutricionista_id) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    try {
      this.loading = true;
      const payload = {
        tipo_id: this.evalLogistica.tipo_id,
        nutricionista_id: this.evalLogistica.nutricionista_id,
        fecha: this.formatearFecha(this.evalLogistica.fecha),
        estado: this.evalLogistica.estado
      };

      if (this.evalLogistica.id) {
        await this.nutricionService.actualizarEvaluacionNutri(this.evalLogistica.id, payload);
        this.mostrarExito('Sesión actualizada correctamente');
      } else {
        await this.nutricionService.crearEvaluacionNutri(payload);
        this.mostrarExito('Sesión creada correctamente');
      }

      this.displayMainDialog = false;
      await this.cargarSesiones();
    } catch (error) {
      this.mostrarError('Error al guardar la sesión');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  eliminarSesion(sesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la sesión "${sesion.tipo_evaluacion?.nombre}"? Se perderán todos los archivos adjuntos.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.loading = true;
          this.cdr.detectChanges();
          await this.nutricionService.eliminarEvaluacionNutri(sesion.id);
          this.mostrarExito('Sesión eliminada correctamente');
          await this.cargarSesiones();
        } catch (error) {
          this.mostrarError('Hubo un error al eliminar la sesión');
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // CALIFICACIÓN Y ARCHIVOS
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data: resultadosPrevios } = await this.nutricionService.getResultadosPorSesionNutri(sesion.id);

      this.estudiantes.forEach(est => {
        const resultadoGuardado = resultadosPrevios?.find((r: any) => r.estudiante_id === est.id);

        est.archivoSeleccionado = null; 
        est.archivo_url_previo = resultadoGuardado ? resultadoGuardado.archivo_url : null;
        est.observacion = resultadoGuardado ? resultadoGuardado.observaciones : '';

        if (est.archivo_url_previo) {
          const urlParts = est.archivo_url_previo.split('/');
          const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
          const underscoreIndex = rawName.indexOf('_');
          est.nombre_archivo_previo = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
        } else {
          est.nombre_archivo_previo = null;
        }
      });

      this.displayGradesDialog = true;
    } catch (error) {
      this.mostrarError('Error al cargar resultados.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: any, estudiante: any) {
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
    estudiante.archivoSeleccionado = null;
    estudiante.observacion = '';
    if(fileInput) fileInput.value = ''; 
    this.cdr.detectChanges();
  }

  async guardarNotasFinales() {
    const porGuardar = this.estudiantes.filter(e => e.archivoSeleccionado);
    if (porGuardar.length === 0) {
      this.mostrarError('No hay archivos nuevos para guardar.');
      return;
    }

    try {
      this.guardando = true;
      this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Subiendo ${porGuardar.length} resultados...` });
      this.cdr.detectChanges();

      for (const est of porGuardar) {
        const archivoUrl = await this.storageService.subirArchivoNutricion(est.archivoSeleccionado, est.archivoSeleccionado.name);
        
        await this.nutricionService.guardarResultadoNutri({
          evaluacion_id: this.evalLogistica.id,
          estudiante_id: est.id,
          archivo_url: archivoUrl,
          observaciones: est.observacion
        });
      }

      this.mostrarExito('Resultados guardados correctamente');
      this.displayGradesDialog = false;
      await this.cargarSesiones();
    } catch (error: any) {
      if (error.code === '23505') {
         this.mostrarError('Algunos estudiantes ya tenían resultados registrados en esta sesión.');
      } else {
         this.mostrarError('Ocurrió un error al subir los archivos.');
      }
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let f = true, p = true, e = true;
      if (this.filtroFecha) f = s.fecha === this.formatearFecha(this.filtroFecha);
      if (this.filtroPrueba) p = s.tipo_id === this.filtroPrueba.id;
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

  formatearFecha(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
  }

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }

}