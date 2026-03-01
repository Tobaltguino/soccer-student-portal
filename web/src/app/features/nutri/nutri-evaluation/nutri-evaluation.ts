import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
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
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-nutri-evaluation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, InputTextModule, ToastModule, 
    ConfirmDialogModule, RadioButtonModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './nutri-evaluation.html',
  styleUrls: ['./nutri-evaluation.css']
})
export class NutriEvaluationsComponent implements OnInit {
  
  // Datos
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];
  nutricionistaId: string | null = null;

  // Filtros
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;
  filtroEstado: string | null = null;
  opcionesEstadoFiltro = [
    { label: 'Pendientes', value: 'PENDIENTE' },
    { label: 'Finalizadas', value: 'FINALIZADO' }
  ];

  // Modales y Estado
  displayMainDialog = false;
  displayGradesDialog = false;
  loading = false;
  guardando = false;

  // Objeto para crear/editar evaluación
  evalLogistica: any = {};

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef 
  ) {}

  async ngOnInit() {
    await this.cargarDatosBase();
  }

  async cargarDatosBase() {
    try {
      this.loading = true;
      this.cdr.detectChanges(); 

      const { data: { user } } = await this.supabase.getUser();
      if (user) {
        const { data: nutri } = await this.supabase.supabase
          .from('nutricionistas')
          .select('id')
          .eq('email', user.email)
          .single();
        this.nutricionistaId = nutri?.id;
      }

      const resTipos = await this.supabase.getTiposEvaluacionNutri();
      this.tiposEvaluacion = resTipos.data || [];

      const resEst = await this.supabase.getEstudiantesBasico();
      // ✅ Preparamos a los estudiantes con los nuevos campos
      this.estudiantes = (resEst.data || []).map(est => ({
        ...est,
        archivoSeleccionado: null,
        archivo_url_previo: null,
        nombre_archivo_previo: null,
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

  abrirNuevo() {
    this.evalLogistica = {
      id: null,
      fecha: new Date(),
      tipo_id: null,
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
    if (!this.evalLogistica.fecha || !this.evalLogistica.tipo_id || !this.nutricionistaId) {
      this.mostrarError('Faltan campos obligatorios');
      return;
    }

    try {
      this.loading = true;
      this.cdr.detectChanges(); 
      
      const payload = {
        tipo_id: this.evalLogistica.tipo_id,
        nutricionista_id: this.nutricionistaId,
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

  // --- LÓGICA MODAL 2: REGISTRAR RESULTADOS ---
  async abrirCalificador(sesion: any) {
    this.evalLogistica = sesion;
    
    try {
      this.loading = true;
      this.cdr.detectChanges();

      // ✅ 1. Buscamos resultados previos
      const resResultados = await this.supabase.getResultadosPorSesionNutri(sesion.id);
      const resultadosPrevios = resResultados.data || [];

      // ✅ 2. Mapeamos la lista limpiando la selección actual pero cargando el historial
      this.estudiantes.forEach(est => {
        const resultadoGuardado = resultadosPrevios.find(r => r.estudiante_id === est.id);

        est.archivoSeleccionado = null; 
        est.archivo_url_previo = resultadoGuardado ? resultadoGuardado.archivo_url : null;
        est.observacion = resultadoGuardado ? resultadoGuardado.observaciones : '';

        // Extraer el nombre original del archivo
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
    if(fileInput) fileInput.value = ''; // ✅ Limpia el input nativo oculto
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