import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
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
import { MessageService, ConfirmationService } from 'primeng/api';

// Core y Shared
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { Rol } from '../../../../../shared/enums/rol.enum';

// Servicios Locales (Feature-Based)
import { UsuarioCentralService } from '../../../administracion/usuarios/services/usuarios-central.service';
import { HistorialClinicoService } from './services/historial-clinico.service';

@Component({
  selector: 'app-historial-clinico',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss']
})
export class HistorialClinicoComponent implements OnInit {

  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioCentralService);
  private historialClinicoService = inject(HistorialClinicoService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false; // Kinesiólogo
  esEstudiante: boolean = false;
  esLector: boolean = false; // Profesor: solo lectura de sus grupos (RLS limita los datos)
  esGestion: boolean = false; // Admin, Kine o Profesor (vista de búsqueda por alumno)
  puedeEditar: boolean = false; // Admin o Kine

  // Listas
  listaAlumnos: any[] = [];
  listaLesiones: any[] = [];
  alumnoSeleccionado: any = null;

  // Estados UI
  cargandoLesiones: boolean = false;
  guardando: boolean = false;
  mostrarDialogoLesion: boolean = false;

  // Formulario
  lesionActual: any = this.getLesionVacia();

  // Enums manuales para filtros visuales
  opcionesTipoLesion = [
    { label: 'Lesión', value: 'LESION' },
    { label: 'Enfermedad', value: 'ENFERMEDAD' },
    { label: 'Alergia', value: 'ALERGIA' }
  ];

  opcionesEstadoLesion = [
    { label: 'En Observación', value: 'EN_OBSERVACION' },
    { label: 'Recuperado', value: 'RECUPERADO' },
    { label: 'En Reintegro Deportivo', value: 'EN_REINTEGRO_DEPORTIVO' },
    { label: 'Crónico', value: 'CRONICO' }
  ];

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.cargandoLesiones = true;
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
      this.puedeEditar = this.esAdmin || this.esStaff;
      this.esGestion = this.puedeEditar || this.esLector;

      if (this.esEstudiante) {
        await this.cargarMisLesiones();
      } else {
        await this.cargarAlumnos();
      }
    } catch (error) {
      this.mostrarError('Error inicializando el módulo de historial clínico.');
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (GESTIÓN: ADMIN / STAFF)
  // ==========================================
  async cargarAlumnos() {
    try {
      // Llamada directa a promesa usando el servicio central unificado
      const response = await this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, limite: 2000, activo: true });
      const alumnosRes = response?.registros || [];

      this.listaAlumnos = alumnosRes.map((est: any) => {
        const idUsuario = est.id_usuario || est.id; // Extraído directo de usu_perfiles
        const nombre = est.nombre;
        const apellido = est.apellido;
        const rut = est.rut;
        return {
            id: idUsuario,
            nombreCompleto: `${nombre} ${apellido} (${rut || 'Sin RUT'})`,
            nombre: nombre,
            apellido: apellido
        };
      });
    } catch (error) {
      this.mostrarError('Error al cargar la lista de pacientes.');
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }

  async onAlumnoChange() {
    if (!this.alumnoSeleccionado) {
      this.listaLesiones = [];
      return;
    }
    
    this.cargandoLesiones = true;
    this.cdr.detectChanges();

    try {
      // 🔥 Promesa nativa
      this.listaLesiones = await this.historialClinicoService.listarHistorialPorEstudiante(this.alumnoSeleccionado.id) || [];
    } catch (error) {
      this.mostrarError('Error al cargar el historial del paciente.');
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (VISTA ESTUDIANTE)
  // ==========================================
  async cargarMisLesiones() {
    this.cargandoLesiones = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (!session?.user?.id) return;
      // 🔥 Promesa nativa
      this.listaLesiones = await this.historialClinicoService.listarHistorialPorEstudiante(session.user.id) || [];
    } catch (error) {
      this.mostrarError('Error al cargar tu historial médico.');
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // GESTIÓN DEL FORMULARIO (SOLO KINESIÓLOGO/ADMIN)
  // ==========================================
  abrirNuevaLesion() {
    if (!this.alumnoSeleccionado) return;
    this.lesionActual = this.getLesionVacia();
    this.mostrarDialogoLesion = true;
  }

  abrirEditarLesion(lesionBd: any) {
    let fechaObj = new Date();
    if (lesionBd.fecha_evento) {
        const fechaStr = (lesionBd.fecha_evento as string).split('T')[0];
        const parts = fechaStr.split('-');
        if (parts.length === 3) fechaObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    
    this.lesionActual = { 
      ...lesionBd,
      fecha_evento: fechaObj
    };
    this.mostrarDialogoLesion = true;
  }

  async guardarLesion() {
    if (this.guardando) return;
    if (!this.lesionActual.fecha_evento || !this.lesionActual.tipo) {
      this.mostrarError('Debe ingresar la fecha y el tipo de registro.');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      tipo: this.lesionActual.tipo,
      diagnostico: this.lesionActual.diagnostico,
      observaciones: this.lesionActual.observaciones,
      estado: this.lesionActual.estado,
      fechaEvento: this.formatearFechaIso(this.lesionActual.fecha_evento)
    };

    try {
      if (this.lesionActual.id) {
        // 🔥 Promesa nativa
        await this.historialClinicoService.actualizarHistorial(this.lesionActual.id, payload);
        this.mostrarExito('Registro actualizado correctamente.');
      } else {
        const payloadConEstudiante = { ...payload, estudianteId: this.alumnoSeleccionado.id };
        // 🔥 Promesa nativa
        await this.historialClinicoService.crearHistorial(payloadConEstudiante);
        this.mostrarExito('Registro creado correctamente.');
      }
      this.mostrarDialogoLesion = false;
      await this.onAlumnoChange(); // Recargar lesiones
    } catch (error) {
      this.mostrarError('No se pudo guardar el registro médico.');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // ELIMINAR REGISTRO (SOLO ADMIN/STAFF)
  // ==========================================
  confirmarEliminarLesion(lesion: any) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar este registro médico? Esta acción no se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.cargandoLesiones = true;
        this.cdr.detectChanges();
        try {
          // 🔥 Promesa nativa
          await this.historialClinicoService.eliminarHistorial(lesion.id);
          this.mostrarExito('Registro médico eliminado exitosamente.');
          await this.onAlumnoChange();
        } catch (error) {
          this.mostrarError('Error al eliminar el registro médico.');
          this.cargandoLesiones = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // HELPERS INTERNOS
  // ==========================================
  private getLesionVacia() {
    return {
      id: null,
      estudiante_id: null,
      tipo: 'LESION',
      diagnostico: '',
      observaciones: '',
      estado: 'EN_OBSERVACION',
      fecha_evento: new Date()
    };
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

  getTipoLabel(tipo: string): string {
    const obj = this.opcionesTipoLesion.find(o => o.value === tipo);
    return obj ? obj.label : tipo;
  }

  getEstadoLabel(estado: string): string {
    const obj = this.opcionesEstadoLesion.find(o => o.value === estado);
    return obj ? obj.label : estado;
  }

  getSeveridadHistorial(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' { 
    if (tipo === 'LESION') return 'danger';
    if (tipo === 'ALERGIA') return 'warn';
    return 'info'; 
  }
  
  getSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' { 
    if (estado === 'RECUPERADO') return 'success';
    if (estado === 'EN_OBSERVACION') return 'warn';
    if (estado === 'EN_REINTEGRO_DEPORTIVO') return 'info';
    return 'danger'; 
  }

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }
}