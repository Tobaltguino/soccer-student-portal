import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';

// Servicios de Dominio
import { ClaseService } from './services/clases.service';
import { GrupoService } from '../grupos/services/grupo.service';
import { AsistenciaService } from '../asistencias/services/asistencias.service';
import { UsuarioCentralService } from '../../administracion/usuarios/services/usuarios-central.service';

// Enums
import { Rol } from '../../../../shared/enums/rol.enum';

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
  private usuarioService = inject(UsuarioCentralService);
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
  clases: any[] = [];
  clasesOriginales: any[] = []; 
  grupos: any[] = [];
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
  selectedClase: any = null;

  displayAttendanceDialog: boolean = false;
  loadingAsistencia: boolean = false;
  alumnosAsistencia: any[] = [];
  claseSeleccionadaAsistencia: any = null;

  displayForm: boolean = false;
  isEditing: boolean = false;
  claseForm: any = this.getFormularioVacio();
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
        if (this.esAdmin || this.esStaff) {
          await this.aplicarFiltrosGestion();
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error inicializando el módulo de clases.' });
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // MÉTODOS DE VISTA GESTIÓN (ADMINISTRADOR / STAFF)
  // =========================================================
  async cargarGrupos() {
    try {
      // 🔥 Llamada directa a la Promesa sin firstValueFrom
      this.grupos = await this.grupoService.listarGrupos() || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
    }
  }

  async aplicarFiltrosGestion() {
    this.loading = true;
    this.cdr.detectChanges();

    const filtros: any = {
      grupoId: this.filtroGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100
    };

    try {
      // 🔥 Llamada directa a la Promesa sin firstValueFrom
      const response: any = await this.claseService.listarClases(filtros);
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
  async verAsistencia(clase: any) {
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
      // 🔥 Promise.all ejecuta las promesas de los servicios en paralelo directamente
      const [estudiantes, asistenciasGuardadas] = await Promise.all([
        this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, grupoIds: [clase.grupo_id], limite: 1000, activo: true }),
        this.asistenciaService.listarPorClase(clase.id)
      ]);

      const asistenciasMap = new Map();
      (asistenciasGuardadas || []).forEach((a: any) => asistenciasMap.set(a.estudiante_id, a.presente));

      this.alumnosAsistencia = (estudiantes.registros || []).map((est: any) => {
        const idUsuario = est.id_usuario || est.id;
        const nombre = est.nombre;
        const apellido = est.apellido;

        return {
          estudianteId: idUsuario,
          nombre: nombre,
          apellido: apellido,
          presente: asistenciasMap.has(idUsuario) ? asistenciasMap.get(idUsuario) : null
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
      asistencias: this.alumnosAsistencia
        .filter(alumno => alumno.presente !== null) 
        .map(alumno => ({
          estudianteId: alumno.estudianteId,
          presente: alumno.presente
        }))
    };

    try {
      // 🔥 Llamada directa a la Promesa
      await this.asistenciaService.registrarLote(this.claseSeleccionadaAsistencia.id, payload);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia guardada correctamente' });
      this.displayAttendanceDialog = false;
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo guardar la asistencia' });
    } finally {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
    }
  }

  // --- FORMULARIO CREAR / EDITAR (SOLO STAFF/ADMIN) ---
  abrirNuevaClase() {
    if (!this.filtroGrupoId) {
      this.messageService.add({ severity: 'info', summary: 'Atención', detail: 'Seleccione un grupo en los filtros primero para asignar la clase' });
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

  abrirEditarClase(clase: any) {
    this.isEditing = true;
    this.vistaFormulario = 'logistica';
    this.claseForm = { ...clase };
    
    if (this.claseForm.fecha) {
      const [year, month, day] = (this.claseForm.fecha as string).split('T')[0].split('-');
      this.claseForm.fecha = new Date(Number(year), Number(month) - 1, Number(day));
    }
    this.displayForm = true;
  }

  async guardarClase() {
    const grupoIdFinal = this.isEditing ? this.claseForm.grupo_id : this.filtroGrupoId;

    if (!grupoIdFinal || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
      this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Complete todos los campos obligatorios de Logística (*).' });
      return;
    }

    const fechaSeleccionada = this.claseForm.fecha as Date;
    if (isNaN(fechaSeleccionada.getTime())) {
      this.messageService.add({ severity: 'warn', summary: 'Fecha Inválida', detail: 'Ingrese una fecha válida.' });
      return;
    }

    this.saving = true;

    const datosParaEnviar: any = {
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
        // 🔥 Llamada directa a la Promesa
        await this.claseService.actualizarClase(this.claseForm.id, datosParaEnviar);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase actualizada correctamente.' });
      } else {
        await this.claseService.crearClase(datosParaEnviar);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase creada correctamente.' });
      }
      this.displayForm = false;
      await this.aplicarFiltrosGestion();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Ocurrió un error al guardar la clase.' });
    } finally {
      this.saving = false;
    }
  }

  // --- ELIMINAR (SOLO ADMIN) ---
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
          // 🔥 Llamada directa a la Promesa
          await this.claseService.eliminarClase(id);
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Clase eliminada exitosamente' });
          await this.aplicarFiltrosGestion();
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
      this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando archivo...' });
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

  private getFormularioVacio(): any {
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
      // 🔥 Llamada directa a la Promesa
      const clases = await this.claseService.obtenerMisClases() || [];
      this.clasesOriginales = [...clases].sort((a: any, b: any) => {
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

  puedeVerPlanificacion(clase: any): boolean {
    if (!clase.fecha || !clase.hora) return false;
    const tiempoClase = new Date(`${clase.fecha.substring(0, 10)}T${clase.hora}`).getTime();
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
  verPlanificacion(clase: any) {
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