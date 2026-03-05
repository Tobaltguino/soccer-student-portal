import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../core/services/supabase.service';
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
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService, 
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarDatosBase();
  }

  async cargarDatosBase() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      await this.cargarTiposEvaluacion();

      const resNutris = await this.supabase.supabase.from('nutricionistas').select('id, nombre, apellido');
      this.nutricionistas = (resNutris.data || []).map(n => ({
        id: n.id,
        nombreCompleto: `${n.nombre} ${n.apellido}`
      }));

      const resEst = await this.supabase.getEstudiantesBasico();
      this.estudiantes = (resEst.data || []).map(est => ({
        ...est,
        archivoSeleccionado: null,
        archivo_url_previo: null,
        nombre_archivo_previo: null, // ✅ Nueva propiedad para el nombre bonito
        observacion: ''
      }));

      await this.cargarSesiones();

    } catch (error) {
      console.error('Error cargando datos', error);
      this.mostrarError('No se pudieron cargar los datos base.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarTiposEvaluacion() {
    const resTipos = await this.supabase.getTiposEvaluacionNutri();
    this.tiposEvaluacion = resTipos.data || [];
  }

  async cargarSesiones() {
    const res = await this.supabase.getEvaluacionesNutri();
    this.sesiones = res.data || [];
    this.aplicarFiltros();
    this.cdr.detectChanges();
  }

  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let cumpleFecha = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      if (this.filtroFecha) {
        const dFiltro = this.filtroFecha.toISOString().split('T')[0];
        cumpleFecha = s.fecha === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = s.tipo_id === this.filtroPrueba.id;
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

  abrirConfiguracionTipos() {
    this.nuevoTipo = { nombre: '', descripcion: '' };
    this.displayTiposDialog = true;
    this.cdr.detectChanges();
  }

  async guardarNuevoTipo() {
    if (!this.nuevoTipo.nombre) return;
    try {
      this.loading = true;
      await this.supabase.crearTipoEvaluacionNutri(this.nuevoTipo);
      this.mostrarExito('Test agregado correctamente');
      this.nuevoTipo = { nombre: '', descripcion: '' };
      await this.cargarTiposEvaluacion(); 
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
          await this.supabase.eliminarTipoEvaluacionNutri(tipo.id);
          this.mostrarExito('Test eliminado correctamente');
          await this.cargarTiposEvaluacion(); 
        } catch (error: any) {
          console.error(error);
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

  abrirNuevo() {
    this.evalLogistica = {
      id: null,
      fecha: new Date(),
      tipo_id: null,
      nutricionista_id: null, 
      estado: 'PENDIENTE'
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
      this.cdr.detectChanges();
      
      const payload = {
        tipo_id: this.evalLogistica.tipo_id,
        nutricionista_id: this.evalLogistica.nutricionista_id,
        fecha: this.evalLogistica.fecha.toISOString().split('T')[0],
        estado: this.evalLogistica.estado
      };

      if (this.evalLogistica.id) {
        await this.supabase.actualizarEvaluacionNutri(this.evalLogistica.id, payload);
        this.mostrarExito('Sesión actualizada correctamente');
      } else {
        await this.supabase.crearEvaluacionNutri(payload);
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
      message: `¿Estás seguro de eliminar la sesión "${sesion.tipo_evaluacion?.nombre}"? Se perderán todos los archivos adjuntos de los estudiantes.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.loading = true;
          this.cdr.detectChanges();
          await this.supabase.eliminarEvaluacionNutri(sesion.id);
          this.mostrarExito('Sesión eliminada correctamente');
          await this.cargarSesiones();
        } catch (error) {
          console.error(error);
          this.mostrarError('Hubo un error al eliminar la sesión');
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  async abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const resResultados = await this.supabase.getResultadosPorSesionNutri(sesion.id);
      const resultadosPrevios = resResultados.data || [];

      this.estudiantes.forEach(est => {
        const resultadoGuardado = resultadosPrevios.find(r => r.estudiante_id === est.id);

        est.archivoSeleccionado = null; 
        est.archivo_url_previo = resultadoGuardado ? resultadoGuardado.archivo_url : null;
        est.observacion = resultadoGuardado ? resultadoGuardado.observaciones : '';

        // ✅ Extraer y limpiar el nombre del archivo de la URL
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
      console.error(error);
      this.mostrarError('Error al cargar los resultados previos.');
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
    if(fileInput) fileInput.value = ''; // Limpia el input nativo oculto
    this.cdr.detectChanges();
  }

  async guardarNotasFinales() {
    const porGuardar = this.estudiantes.filter(e => e.archivoSeleccionado);

    if (porGuardar.length === 0) {
      this.mostrarError('No has adjuntado ningún archivo nuevo para guardar.');
      return;
    }

    try {
      this.guardando = true;
      this.messageService.add({ severity: 'info', summary: 'Guardando', detail: `Subiendo ${porGuardar.length} resultados...` });
      this.cdr.detectChanges();

      for (const est of porGuardar) {
        const archivoUrl = await this.supabase.subirArchivoNutricion(est.archivoSeleccionado, est.archivoSeleccionado.name);
        
        await this.supabase.guardarResultadoNutri({
          evaluacion_id: this.evalLogistica.id,
          estudiante_id: est.id,
          archivo_url: archivoUrl,
          observaciones: est.observacion
        });
      }

      this.mostrarExito('Todos los resultados se guardaron correctamente');
      this.displayGradesDialog = false;

    } catch (error: any) {
      console.error(error);
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

  mostrarExito(mensaje: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.cdr.detectChanges();
  }
  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    this.cdr.detectChanges();
  }
}