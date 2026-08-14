import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber'; 
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker'; 
import { FileUploadModule } from 'primeng/fileupload'; 

// Services & Directives
import { FilterService, ConfirmationService, MessageService } from 'primeng/api';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { RutFormatDirective } from '../../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../../shared/directives/rut-validator.directive';

// Nuevos Servicios de Dominio
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { Rol, CrearUsuarioPayload, ActualizarUsuarioPayload } from '../../../../core/domains/usuarios/central/models/usuario.interface'
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, InputNumberModule, ConfirmDialogModule, SelectModule, MultiSelectModule, 
    ToastModule, TagModule, CheckboxModule, TooltipModule, DatePickerModule,
    FileUploadModule, RutFormatDirective
  ],
  providers: [ConfirmationService, MessageService, FilterService],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css']
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  // --- SERVICIOS ---
  private usuarioService = inject(UsuarioService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private filterService = inject(FilterService);

  // --- DATOS ---
  dataList: any[] = []; 
  listaGrupos: any[] = [];
  listaPosiciones: any[] = [
    { id: 'portero', nombre: 'Portero' },
    { id: 'defensa', nombre: 'Defensa' },
    { id: 'mediocampista', nombre: 'Mediocampista' },
    { id: 'delantero', nombre: 'Delantero' }
  ];
  
  // --- CONFIGURACIÓN DE VISTA ---
  vistaActual: Rol = Rol.ESTUDIANTE;
  
  opcionesVista = [
    { label: 'Estudiantes', value: Rol.ESTUDIANTE },
    { label: 'Profesores', value: Rol.PROFESOR },
    { label: 'Administradores', value: Rol.ADMINISTRADOR },
    { label: 'Kinesiólogos', value: Rol.KINESIOLOGO },
    { label: 'Nutricionistas', value: Rol.NUTRICIONISTA }
  ];

  opcionesEstado = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  listaTiposProfesor = [
    { label: 'Profesor de Fútbol', value: 'profesor de futbol' },
    { label: 'Preparador Físico', value: 'preparador fisico' }
  ];

  filtros: any = { global: '', grupo: null, posicion: null, tipoProfesor: null, estado: null };

  // --- ESTADOS UI ---
  loading: boolean = false;
  displayDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';
  maxDate: Date = new Date(); 

  // --- VARIABLES PARA FOTOS ---
  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;
  uploadingFoto: boolean = false;

  // --- VARIABLES PARA LA FICHA MÉDICA ---
  displayFicha: boolean = false;
  selectedEstudianteFicha: any = null;
  historialClinico: any[] = [];
  loadingHistorial: boolean = false;

  // --- FORMULARIO ---
  userForm: any = this.getFormularioVacio();

  ngOnInit() {
    this.configurarFiltrosPersonalizados();
    this.cargarMaestros();
    this.cargarDatos();
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (!filter || filter.length === 0) return true;
      if (!value) return false;
      return value.some((p: string) => filter.includes(p));
    });
  }

  cargarMaestros() {
    this.grupoService.listarGrupos().subscribe({
      next: (data) => this.listaGrupos = data,
      error: () => this.messageService.add({ severity: 'error', summary: 'Aviso', detail: 'No se pudieron cargar los grupos' })
    });
  }

  cambiarVista() { 
    this.limpiarFiltros();
    this.cargarDatos(); 
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, tipoProfesor: null, estado: null };
    if (this.dt) this.dt.reset();
  }

  cargarDatos() {
    this.loading = true;
    this.dataList = [];

    this.usuarioService.listarUsuarios({ rol: this.vistaActual, limite: 200 }).subscribe({
      next: (res) => {
        this.dataList = res.registros.map(user => ({
          ...user,
          grupo_id: user.datosEstudiante?.grupo_id,
          posiciones: user.datosEstudiante?.posiciones || [],
          tipo_profesor: user.datosProfesor?.tipo_profesor,
          peso: user.datosEstudiante?.peso,
          altura: user.datosEstudiante?.altura,
          prevision: user.datosEstudiante?.prevision,
          direccion: user.datosEstudiante?.direccion
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de usuarios' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- LÓGICA DE FOTOS ---
  onFileSelected(event: any) {
    const file = event.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      // Mostrar la vista previa inmediatamente
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        this.cdr.detectChanges(); 
      };
      reader.readAsDataURL(file);
    }
  }

  clearFoto() {
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    // Al dejar previewUrl en null, le indicamos al backend que debe eliminar la foto al guardar.
  }

  // --- LÓGICA DE FORMULARIO ---
  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarForm();
    this.displayDialog = true;
  }

  abrirEditar(usuario: any) {
    if (usuario.rut === '1-1') {
        this.messageService.add({ severity: 'info', summary: 'Cuenta Protegida', detail: 'El Administrador maestro no puede ser modificado aquí.' });
        return;
    }

    this.isEditing = true;
    this.tituloDialogo = 'Editar Usuario';
    this.limpiarForm();

    let fechaNac = null;
    if (usuario.fecha_nacimiento) {
        const parts = usuario.fecha_nacimiento.split('-'); 
        if(parts.length === 3) fechaNac = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }

    this.userForm = { 
      ...usuario, 
      id: usuario.id_usuario, 
      fecha_nacimiento: fechaNac, 
      posicionesIds: usuario.posiciones || []
    };
    
    // ✅ Cargamos la foto actual si existe
    this.previewUrl = usuario.foto_url || null; 
    this.displayDialog = true;
  }

  limpiarForm() {
    this.userForm = this.getFormularioVacio();
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    this.uploadingFoto = false;
  }

  private getFormularioVacio() {
    return { 
      id: null, nombre: '', apellido: '', rut: '', email: '', fecha_nacimiento: null, activo: true, 
      grupo_id: null, tipo_profesor: '', posicionesIds: [], direccion: '', prevision: '', peso: null, altura: null
    };
  }

  guardar() {
    if (this.isEditing && this.userForm.rut === '1-1') return;
    
    if (!this.userForm.nombre || !this.userForm.apellido || !this.userForm.email || !this.userForm.rut) {
        this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Completa todos los campos obligatorios (*).' }); return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.userForm.email)) {
        this.messageService.add({ severity: 'error', summary: 'Email Inválido', detail: 'Formato incorrecto.' }); return;
    }

    const rutLimpio = this.userForm.rut.replace(/\./g, '').trim();
    if (!RutValidator.esValido(rutLimpio)) {
        this.messageService.add({ severity: 'error', summary: 'RUT Inválido', detail: 'El RUT ingresado no es válido.' }); return;
    }

    this.loading = true;

    // 1. Armamos el Payload de Datos
    const payload: Partial<CrearUsuarioPayload> = {
      rut: rutLimpio,
      nombre: this.userForm.nombre,
      apellido: this.userForm.apellido,
      email: this.userForm.email.toLowerCase(),
      rol: this.vistaActual,
      fechaNacimiento: this.userForm.fecha_nacimiento ? this.formatearFecha(this.userForm.fecha_nacimiento) : undefined
    };

    if (this.vistaActual === Rol.ESTUDIANTE) {
      payload.peso = this.userForm.peso;
      payload.altura = this.userForm.altura;
      payload.posiciones = this.userForm.posicionesIds;
      payload.grupoId = this.userForm.grupo_id;
      payload.direccion = this.userForm.direccion;
      payload.prevision = this.userForm.prevision;
    } else if (this.vistaActual === Rol.PROFESOR) {
      payload.tipoProfesor = this.userForm.tipo_profesor;
    }

    // 2. Ejecutamos la creación o actualización de los datos básicos
    if (this.isEditing) {
      this.usuarioService.actualizarUsuario(this.userForm.id, payload as ActualizarUsuarioPayload).subscribe({
        next: (res) => this.procesarFotoYFinalizar(res.id_usuario, 'Usuario actualizado con éxito'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    } else {
      payload.passwordTemporal = rutLimpio.replace(/-/g, '');
      this.usuarioService.crearUsuario(payload as CrearUsuarioPayload).subscribe({
        next: (res) => this.procesarFotoYFinalizar(res.id_usuario, 'Usuario creado con éxito'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    }
  }

  // ✅ 3. Flujo Secuencial: Sube/Elimina foto después de guardar el usuario
  private procesarFotoYFinalizar(userId: string, mensaje: string) {
    if (this.archivoSeleccionado) {
      // El usuario eligió una foto nueva
      this.uploadingFoto = true;
      this.usuarioService.actualizarFoto(userId, this.archivoSeleccionado).subscribe({
        next: () => this.finalizarGuardado(mensaje),
        error: () => this.finalizarGuardado(mensaje + ' (Pero no se pudo subir la foto)')
      });
    } else if (this.isEditing && !this.previewUrl) {
      // El usuario estaba editando y borró la foto (click en el basurero)
      this.usuarioService.eliminarFoto(userId).subscribe({
        next: () => this.finalizarGuardado(mensaje),
        error: () => this.finalizarGuardado(mensaje + ' (Pero no se pudo eliminar la foto anterior)')
      });
    } else {
      // No hubo cambios en la foto
      this.finalizarGuardado(mensaje);
    }
  }

  private finalizarGuardado(mensaje: string) {
    this.loading = false;
    this.uploadingFoto = false;
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.cargarDatos();
  }

  private mostrarErrorGuardado(err: any) {
    this.loading = false;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al procesar la solicitud' });
    this.cdr.detectChanges();
  }

  // --- ACCIONES DE TABLA ---
  toggleEstado(usuario: any) {
    if (usuario.rut === '1-1') return;
    this.confirmationService.confirm({
      message: `¿Deseas ${usuario.activo ? 'desactivar' : 'reactivar'} a ${usuario.nombre}?`,
      header: 'Confirmar estado',
      icon: usuario.activo ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      acceptLabel: 'Sí', rejectLabel: 'Cancelar', acceptButtonStyleClass: usuario.activo ? 'p-button-danger' : 'p-button-success',
      accept: () => {
        const action$ = usuario.activo 
          ? this.usuarioService.desactivarUsuario(usuario.id_usuario) 
          : this.usuarioService.reactivarUsuario(usuario.id_usuario);
          
        action$.subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado.' });
            this.cargarDatos();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado.' })
        });
      }
    });
  }

  eliminar(usuario: any) {
    if (usuario.rut === '1-1') return;
    this.confirmationService.confirm({
      message: `¿Eliminar permanentemente a ${usuario.nombre}? Esta acción borra todo su historial.`,
      header: 'Eliminar Usuario', icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar', acceptButtonStyleClass: 'p-button-danger', rejectLabel: 'Cancelar',
      accept: () => {
        this.usuarioService.eliminarUsuario(usuario.id_usuario).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario borrado del sistema.' });
            this.cargarDatos();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se puede eliminar.' })
        });
      }
    });
  }

  // --- UTILIDADES ---
  getGrupoNombre(grupoId: any): string {
    const grupo = this.listaGrupos.find(g => g.id === grupoId); return grupo ? grupo.nombre : 'Desconocido';
  }

  formatearFecha(date: Date): string {
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
  }

  calcularEdad(fecha: any): number | null {
    if (!fecha) return null;
    const born = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--;
    return age;
  }

  abrirFicha(estudiante: any) {
    this.selectedEstudianteFicha = estudiante;
    this.displayFicha = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.cdr.detectChanges();

    this.historialClinicoService.listarHistorialPorEstudiante(estudiante.id_usuario).subscribe({
      next: (data) => {
        this.historialClinico = data || [];
        this.loadingHistorial = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial médico.' });
        this.loadingHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSeveridadHistorial(tipo: string): any { 
    if (tipo === 'LESION') return 'danger';
    if (tipo === 'ALERGIA') return 'warning';
    return 'info'; // PATOLOGIA u otros
  }
  
  getSeveridadEstado(estado: string): any { 
    if (estado === 'RECUPERADO') return 'success';
    if (estado === 'EN_OBSERVACION') return 'warning';
    if (estado === 'EN_REINTEGRO_DEPORTIVO') return 'info';
    return 'danger'; // EN_TRATAMIENTO
  }
}