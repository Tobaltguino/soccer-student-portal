import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { FilterService, MessageService } from 'primeng/api';

// Core y Shared
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Posicion } from '../../../../shared/enums/posicion.enum';
import { Rol } from '../../../../shared/enums/rol.enum';

// Servicios Locales (Feature-Based)
import { UsuarioCentralService } from '../../administracion/usuarios/services/usuarios-central.service';
import { GrupoService } from '../grupos/services/grupo.service';
import { HistorialClinicoService } from '../../salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { calcularEdad } from '../../../../shared/utils/fechas.util';

@Component({
  selector: 'app-ver-estudiantes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    MultiSelectModule, SelectModule, TagModule, TooltipModule, DialogModule, ToastModule
  ],
  providers: [MessageService, FilterService],
  templateUrl: './ver-estudiantes.component.html',
  styleUrls: ['./ver-estudiantes.component.scss']
})
export class VerEstudiantesComponent implements OnInit {

  @ViewChild('dt') dt: Table | undefined;

  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioCentralService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private messageService = inject(MessageService);
  private filterService = inject(FilterService);
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esProfesor: boolean = false;
  esKinesiologo: boolean = false;

  // Estados UI
  loading: boolean = true;
  displayDetalle: boolean = false;
  loadingHistorial: boolean = false;
  
  // Datos
  dataList: any[] = [];
  listaGrupos: any[] = [];
  historialClinico: any[] = [];
  selectedEstudiante: any = null;
  estadoSaludDetalle: string = 'RECUPERADO';

  listaPosiciones = [
    { id: Posicion.PORTERO, nombre: 'Portero' },
    { id: Posicion.DEFENSA_CENTRAL, nombre: 'Defensa Central' },
    { id: Posicion.LATERAL_DERECHO, nombre: 'Lateral Derecho' },
    { id: Posicion.LATERAL_IZQUIERDO, nombre: 'Lateral Izquierdo' },
    { id: Posicion.MEDIOCAMPISTA_DEFENSIVO, nombre: 'Mediocampista Defensivo' },
    { id: Posicion.MEDIOCAMPISTA_CENTRAL, nombre: 'Mediocampista Central' },
    { id: Posicion.MEDIOCAMPISTA_OFENSIVO, nombre: 'Mediocampista Ofensivo' },
    { id: Posicion.EXTREMO, nombre: 'Extremo' },
    { id: Posicion.DELANTERO_CENTRO, nombre: 'Delantero Centro' }
  ];

  opcionesEstado = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  filtros: any = { global: '', grupo: null, posicion: null, estado: null };

  async ngOnInit() {
    this.configurarFiltrosPersonalizados();
    await this.verificarRolYCargar();
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any[], filter: any[]): boolean => {
      if (!filter || filter.length === 0) return true;
      if (!value || value.length === 0) return false;
      return value.some(p => filter.includes(p));
    });
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

      this.esProfesor = this.rolActual === 'profesor';
      this.esKinesiologo = this.rolActual === 'kinesiologo';

      await this.cargarDatos();
    } catch (error) {
      this.mostrarError('Error al verificar permisos del usuario.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarDatos() {
    this.loading = true;
    this.dataList = [];
    this.cdr.detectChanges();

    try {
      // 1. Obtener los grupos asignados al Staff logueado (Llamada directa a Promesa)
      this.listaGrupos = await this.grupoService.obtenerMisGrupos() || [];
      const misGrupoIds = this.listaGrupos.map(g => g.id).filter(id => id !== undefined);

      if (misGrupoIds.length === 0) {
        this.loading = false;
        this.cdr.detectChanges();
        return; // No tiene grupos asignados
      }

      // 2. Obtener los estudiantes que pertenecen a esos grupos usando el UsuarioCentralService
      const response = await this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, grupoIds: misGrupoIds, limite: 1000, activo: true });
      const estudiantesBD = response?.registros || [];

      this.dataList = estudiantesBD.map((est: any) => {
        const idUsuario = est.id_usuario || est.id; // Viene directo de usu_perfiles
        const nombre = est.nombre;
        const apellido = est.apellido;
        const rut = est.rut;
        const email = est.email;
        const foto_url = est.foto_url;

        return {
          id: idUsuario,
          nombre,
          apellido,
          rut,
          email,
          foto_url,
          fecha_nacimiento: est.fecha_nacimiento,
          grupo_id: est.datosEstudiante?.grupo_id,
          posiciones: est.datosEstudiante?.posiciones || [],
          direccion: est.datosEstudiante?.direccion,
          prevision: est.datosEstudiante?.prevision,
          peso: est.datosEstudiante?.peso,
          altura: est.datosEstudiante?.altura,
          activo: est.activo ?? true,
          estado_salud: est.datosEstudiante?.estado_salud || 'RECUPERADO'
        };
      });

    } catch (error) {
      this.mostrarError('No se pudo cargar el directorio de estudiantes.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async verDetalle(estudiante: any) {
    this.selectedEstudiante = estudiante;
    this.displayDetalle = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.estadoSaludDetalle = 'RECUPERADO';
    this.cdr.detectChanges();

    try {
      // Cargamos el historial médico del alumno mediante Promesa nativa
      const historial = await this.historialClinicoService.listarHistorialPorEstudiante(estudiante.id);
      this.historialClinico = historial || [];

      // Si es profesor, calculamos el estado de salud basado en el evento más reciente
      if (this.esProfesor && this.historialClinico.length > 0) {
        this.estadoSaludDetalle = this.historialClinico[0].estado || 'RECUPERADO';
      }

    } catch (error) {
      this.mostrarError('Error al cargar la información de salud del estudiante.');
    } finally {
      this.loadingHistorial = false;
      this.cdr.detectChanges();
    }
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, estado: null };
    if (this.dt) this.dt.reset();
  }

  getGrupoNombre(grupoId: any): string {
    const grupo = this.listaGrupos.find(g => g.id === grupoId);
    return grupo ? grupo.nombre : 'Sin Grupo';
  }

  calcularEdad(fecha: any): number | null {
    return calcularEdad(fecha);
  }

  formatEstadoSalud(estado: string): string {
    if (!estado) return 'Sano';
    const formated = estado.replace(/_/g, ' ');
    return formated.charAt(0).toUpperCase() + formated.slice(1).toLowerCase();
  }

  getSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' { 
    if (estado === 'RECUPERADO') return 'success';
    if (estado === 'EN_OBSERVACION') return 'warn';
    if (estado === 'EN_REINTEGRO_DEPORTIVO') return 'info';
    if (estado === 'CRONICO' || estado === 'LESIONADO') return 'danger';
    return 'success'; 
  }

  getSeveridadHistorial(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' { 
    if (tipo === 'LESION') return 'danger';
    if (tipo === 'ALERGIA') return 'warn';
    return 'info'; 
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}