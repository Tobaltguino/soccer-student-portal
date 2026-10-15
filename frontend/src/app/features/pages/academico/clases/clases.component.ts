import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs'; // 🔥 IMPORTANTE: Importamos firstValueFrom

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';

// Servicios Core
import { AuthService } from '../../../../core/auth/auth.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';

// Servicios de Dominio
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

// Interfaces
import { Clase, CrearClasePayload, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

@Component({
  selector: 'app-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, TagModule, ToastModule, ConfirmDialogModule,
    DatePickerModule, CheckboxModule, TooltipModule, SelectButtonModule, TextareaModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss']
})
export class ClasesComponent implements OnInit {

  private authService = inject(AuthService);
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private excelService = inject(ExcelExportService);
  private cdr = inject(ChangeDetectorRef);

  // Control de Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false; 
  esEstudiante: boolean = false;
  esVistaGestion: boolean = false; 

  // Estado General
  loading: boolean = true;
  saving: boolean = false;
  
  // Datos
  clases: Clase[] = [];
  clasesOriginales: Clase[] = []; 
  grupos: Grupo[] = [];
  totalRegistros: number = 0;

  // Filtros
  filtroFecha: Date | null = null;
  filtroGrupoId: number | null = null;
  filtroLugar: string = '';
  filtroAsistencia: boolean | 'null' | null = null;

  opcionesAsistencia = [
    { label: 'Presente', value: true },
    { label: 'Ausente', value: false },
    { label: 'Pendiente', value: 'null' }
  ];

  // Modales
  displayPlan: boolean = false;
  selectedClase: Clase | null = null;

  displayAttendanceDialog: boolean = false;
  loadingAsistencia: boolean = false;
  alumnosAsistencia: any[] = [];
  claseSeleccionadaAsistencia: Clase | null = null;

  displayForm: boolean = false;
  isEditing: boolean = false;
  claseForm: Partial<Clase> = this.getFormularioVacio();
  vistaFormulario: string = 'logistica';
  opcionesVistaForm = [
    { label: 'Logística', value: 'logistica', icon: 'pi pi-calendar' },
    { label: 'Planificación', value: 'planificacion', icon: 'pi pi-list' }
  ];

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
      this.esStaff = this.rolActual === 'profesor' || this.rolActual === 'kinesiologo';
      this.esVistaGestion = this.esAdmin || this.esStaff;

      if (this.esEstudiante) {
        await this.cargarClasesEstudiante();
      } else {
        await this.cargarGrupos();
        if (this.esAdmin) {
          await this.aplicarFiltrosGestion();
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
      console.error('Error inicializando módulo de clases:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // MÉTODOS DE VISTA GESTIÓN (ADMINISTRADOR / STAFF)
  // =========================================================
  async cargarGrupos() {
    try {
      // 🔥 Convertimos el Observable a Promesa
      this.grupos = await firstValueFrom(this.grupoService.listarGrupos()) || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
    }
  }

  async aplicarFiltrosGestion() {
    this.loading = true;
    this.cdr.detectChanges();

    const filtros: FiltrosClase = {
      grupoId: this.filtroGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100
    };

    try {
      // 🔥 Convertimos el Observable a Promesa
      const response = await firstValueFrom(this.claseService.listarClases(filtros));
      this.clases = response.registros || [];
      this.totalRegistros = response.total || 0;
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onGrupoChange() {
    if (this.esStaff || this.esAdmin) {
      this.aplicarFiltrosGestion();
    }
  }

  limpiarFiltrosGestion() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroLugar = '';
    this.aplicarFiltrosGestion();
  }

  // --- ASISTENCIA ---
  async verAsistencia(clase: Clase) {
    this.claseSeleccionadaAsistencia = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.alumnosAsistencia = [];
    this.cdr.detectChanges();

    if (!clase.grupo_id || !clase.id) {
      this.loadingAsistencia = false;
      return;
    }

    try {
      // 🔥 Convertimos ambos Observables a Promesas y las disparamos en paralelo
      const [estudiantes, asistenciasGuardadas] = await Promise.all([
        firstValueFrom(this.estudianteService.listarEstudiantes({ grupoIds: [clase.grupo_id], limite: 1000, activo: true })),
        firstValueFrom(this.asistenciaService.listarPorClase(clase.id))
      ]);

      const asistenciasMap = new Map();
      (asistenciasGuardadas || []).forEach((a: any) => asistenciasMap.set(a.estudiante_id, a.presente));

      this.alumnosAsistencia = (estudiantes.registros || []).map((est: any) => {
        const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
        const nombre = est.perfil ? est.perfil.nombre : est.nombre;
        const apellido = est.perfil ? est.perfil.apellido : est.apellido;

        return {
          estudianteId: idUsuario,
          nombre: nombre,
          apellido: apellido,
          presente: asistenciasMap.has(idUsuario) ? asistenciasMap.get(idUsuario) : false
        };
      });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la asistencia' });
    } finally {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
    }
  }

  async guardarAsistencia() {
    if (!this.claseSeleccionadaAsistencia || !this.claseSeleccionadaAsistencia.id) return;

    this.loadingAsistencia = true;
    const payload = {
      asistencias: this.alumnosAsistencia.map(alumno => ({
        estudianteId: alumno.estudianteId,
        presente: alumno.presente
      }))
    };

    try {
      // 🔥 Convertimos el Observable a Promesa
      await firstValueFrom(this.asistenciaService.registrarLote(this.claseSeleccionadaAsistencia.id, payload));
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia guardada correctamente' });
      this.displayAttendanceDialog = false;
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo guardar la asistencia' });
    } finally {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
    }
  }

  // --- FORMULARIO CREAR / EDITAR (SOLO STAFF) ---
  abrirNuevaClase() {
    if (!this.filtroGrupoId) {
      this.messageService.add({ severity: 'info', summary: 'Atención', detail: 'Seleccione un grupo en los filtros primero' });
      return;
    }
    this.isEditing = false;
    this.vistaFormulario = 'logistica';
    this.claseForm = this.getFormularioVacio();
    this.claseForm.grupo_id = this.filtroGrupoId;

    const ahora = new Date();
    this.claseForm.hora = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2);
    this.displayForm = true;
  }

  abrirEditarClase(clase: Clase) {
    this.isEditing = true;
    this.vistaFormulario = 'logistica';
    this.claseForm = { ...clase };
    
    if (this.claseForm.fecha) {
      const [year, month, day] = (this.claseForm.fecha as string).split('-');
      this.claseForm.fecha = new Date(Number(year), Number(month) - 1, Number(day)) as any;
    }
    this.displayForm = true;
  }

  async guardarClase() {
    const grupoIdFinal = this.isEditing ? this.claseForm.grupo_id : this.filtroGrupoId;

    if (!grupoIdFinal || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
      this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios de Logística (*).' });
      return;
    }

    const fechaSeleccionada = this.claseForm.fecha as unknown as Date;
    if (isNaN(fechaSeleccionada.getTime())) {
      this.messageService.add({ severity: 'warn', summary: 'Fecha Inválida', detail: 'Ingrese una fecha válida.' });
      return;
    }

    this.saving = true;

    const datosParaEnviar: CrearClasePayload = {
      grupoId: grupoIdFinal,
      fecha: this.formatearFecha(fechaSeleccionada),
      hora: this.claseForm.hora,
      lugar: this.claseForm.lugar?.trim() || undefined,
      objetivo: this.claseForm.objetivo?.trim() || undefined,
      calentamiento: this.claseForm.calentamiento?.trim() || undefined,
      partePrincipal: this.claseForm.parte_principal?.trim() || undefined,
      vueltaCalma: this.claseForm.vuelta_calma?.trim() || undefined
    };

    try {
      if (this.isEditing && this.claseForm.id) {
        await firstValueFrom(this.claseService.actualizarClase(this.claseForm.id as number, datosParaEnviar));
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase actualizada correctamente.' });
      } else {
        await firstValueFrom(this.claseService.crearClase(datosParaEnviar));
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase creada correctamente.' });
      }
      this.displayForm = false;
      this.aplicarFiltrosGestion();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Ocurrió un error al guardar la clase.' });
    } finally {
      this.saving = false;
    }
  }

  // --- ELIMINAR (SOLO ADMIN) ---
  // 🔥 FIX: id tipado como number
  eliminarClase(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta clase y su asistencia? Esta acción no se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          // 🔥 Convertimos el Observable a Promesa
          await firstValueFrom(this.claseService.eliminarClase(id));
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Clase eliminada exitosamente' });
          this.aplicarFiltrosGestion();
        } catch (err: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo eliminar la clase' });
        }
      }
    });
  }

  // --- EXPORTAR EXCEL (SOLO ADMIN) ---
  descargarExcel() {
    if (this.clases.length === 0 && !this.filtroFecha && !this.filtroGrupoId) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay clases para exportar con los filtros actuales.' });
      return;
    }

    let fechaDesdeStr = undefined;
    let fechaHastaStr = undefined;

    if (this.filtroFecha) {
      const year = this.filtroFecha.getFullYear();
      const month = this.filtroFecha.getMonth();
      const primerDia = new Date(year, month, 1);
      const ultimoDia = new Date(year, month + 1, 0);

      fechaDesdeStr = this.formatearFecha(primerDia);
      fechaHastaStr = this.formatearFecha(ultimoDia);
    }

    try {
      this.excelService.exportarClases({
        grupoId: this.filtroGrupoId || undefined,
        desde: fechaDesdeStr,
        hasta: fechaHastaStr,
        lugar: this.filtroLugar?.trim() || undefined
      });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el archivo Excel' });
    }
  }

  obtenerNombreGrupo(grupoId: number): string {
    return this.grupos.find(g => g.id === grupoId)?.nombre || `Grupo #${grupoId}`;
  }

  private getFormularioVacio(): Partial<Clase> {
    return {
      grupo_id: undefined, fecha: undefined, hora: undefined, lugar: undefined,
      objetivo: undefined, calentamiento: undefined, parte_principal: undefined, vuelta_calma: undefined
    };
  }

  // =========================================================
  // MÉTODOS DE VISTA ESTUDIANTE
  // =========================================================
  async cargarClasesEstudiante() {
    this.loading = true;
    try {
      // 🔥 Convertimos el Observable a Promesa
      const clases = await firstValueFrom(this.claseService.obtenerMisClases()) || [];
      this.clasesOriginales = [...clases].sort((a, b) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
        const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
        return tiempoB - tiempoA;
      });
      this.aplicarFiltrosEstudiante();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus clases' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltrosEstudiante() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true;
      let cumpleLugar = true;
      let cumpleAsistencia = true;

      if (this.filtroFecha) {
        const fechaBusqueda = this.formatearFecha(this.filtroFecha);
        const fechaClase = clase.fecha ? clase.fecha.substring(0, 10) : '';
        cumpleFecha = fechaClase === fechaBusqueda;
      }

      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
        const lugarClase = (clase.lugar || '').toLowerCase();
        const busqueda = this.filtroLugar.toLowerCase();
        cumpleLugar = lugarClase.includes(busqueda);
      }

      if (this.filtroAsistencia !== null) {
        if (this.filtroAsistencia === 'null') {
          cumpleAsistencia = clase.presente === null || clase.presente === undefined;
        } else {
          cumpleAsistencia = clase.presente === this.filtroAsistencia;
        }
      }

      return cumpleFecha && cumpleLugar && cumpleAsistencia;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltrosEstudiante() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.filtroAsistencia = null;
    this.aplicarFiltrosEstudiante();
  }

  puedeVerPlanificacion(clase: Clase): boolean {
    if (!clase.fecha || !clase.hora) return false;
    const tiempoClase = new Date(`${clase.fecha}T${clase.hora}`).getTime();
    return tiempoClase <= new Date().getTime();
  }

  getAsistenciaLabel(presente: boolean | null | undefined): string {
    if (presente === true) return 'Presente';
    if (presente === false) return 'Ausente';
    return 'Pendiente';
  }

  getAsistenciaSeverity(presente: boolean | null | undefined): 'success' | 'danger' | 'secondary' {
    if (presente === true) return 'success';
    if (presente === false) return 'danger';
    return 'secondary';
  }

  // =========================================================
  // UTILIDADES COMPARTIDAS
  // =========================================================
  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  formatearFecha(date: Date): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
    } catch (e) {
      return '';
    }
  }
}