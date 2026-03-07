import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
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
import { SupabaseService } from '../../../../core/services/supabase.service';
import { RutFormatDirective } from '../../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../../shared/directives/rut-validator.directive';


@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, ConfirmDialogModule, SelectModule, MultiSelectModule, 
    ToastModule, TagModule, CheckboxModule, TooltipModule, DatePickerModule,
    FileUploadModule, 
    RutFormatDirective
  ],
  providers: [ConfirmationService, MessageService, FilterService],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css']
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  // --- DATOS ---
  dataList: any[] = []; 
  listaGrupos: any[] = [];
  listaPosiciones: any[] = [];
  
  // --- CONFIGURACIÓN DE VISTA ---
  vistaActual: string = 'estudiantes';
  
  opcionesVista = [
    { label: 'Estudiantes', value: 'estudiantes' },
    { label: 'Profesores', value: 'profesores' },
    { label: 'Administradores', value: 'admins' },
    { label: 'Kinesiólogos', value: 'kinesiologos' },
    { label: 'Nutricionistas', value: 'nutricionistas' }
  ];

  opcionesEstado = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  listaTiposProfesor = [
    { label: 'Profesor de Fútbol', value: 'Profesor de futbol' },
    { label: 'Preparador Físico', value: 'Preparador fisico' },
    { label: 'Preparador de Arqueros', value: 'Preparador de arqueros' }
  ];

  // --- FILTROS ---
  filtros: any = {
    global: '',
    grupo: null,
    posicion: null,
    tipoProfesor: null,
    estado: null
  };

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

  // --- FORMULARIO ---
  userForm: any = {
    id: null, 
    nombre: '', 
    apellido: '', 
    rut: '', 
    email: '', 
    password: '', 
    fecha_nacimiento: null, 
    activo: true, 
    grupo_id: null, 
    tipo_profesor: '',
    posicionesIds: [], 
    gruposIds: [],
    foto_url: null 
  };

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private filterService: FilterService
  ) {}

  ngOnInit() {
    this.configurarFiltrosPersonalizados();
    this.cargarMaestros();
    this.cargarDatos();
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (filter === undefined || filter === null || filter.length === 0) return true;
      if (value === undefined || value === null) return false;
      return value.some((p: any) => filter.includes(p.posicion_id));
    });
  }

  async cargarMaestros() {
    const resGrupos = await this.supabase.getGrupos();
    if(resGrupos.data) this.listaGrupos = resGrupos.data;
    
    const resPos = await this.supabase.getPosiciones();
    if(resPos.data) this.listaPosiciones = resPos.data;

    this.cdr.detectChanges();
  }

  cambiarVista() { 
    this.limpiarFiltros();
    this.cargarDatos(); 
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, tipoProfesor: null, estado: null };
    if (this.dt) this.dt.reset();
  }

  async cargarDatos() {
    this.loading = true;
    this.dataList = [];
    try {
      let res: any;
      switch(this.vistaActual) {
        case 'estudiantes': res = await this.supabase.getEstudiantes(); break;
        case 'profesores': res = await this.supabase.getProfesores(); break;
        case 'admins': res = await this.supabase.getAdmins(); break;
        case 'kinesiologos': 
          // ✅ Necesitamos traer los grupos asignados a cada kine en la consulta principal
          res = await this.supabase.supabase.from('kinesiologos').select(`
            *,
            grupos_kine (grupo_id)
          `); 
          break;
        case 'nutricionistas': res = await this.supabase.getNutricionistas(); break;
      }
      if (res?.data) this.dataList = res.data;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  calcularEdad(fecha: string | Date): number | null {
    if (!fecha) return null;
    const born = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    const monthDiff = today.getMonth() - born.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--;
    return age;
  }

  // --- GESTIÓN DE FOTOS ---

  onFileSelected(event: any) {
    const file = event.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      
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
    this.userForm.foto_url = null; 
  }

  // --- ABM (CRUD) ---

  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarForm();
    this.displayDialog = true;
  }

  abrirEditar(usuario: any) {
    if (usuario.rut === '1-1') {
        this.messageService.add({ 
            severity: 'info', 
            summary: 'Cuenta Protegida', 
            detail: 'Los datos del administrador maestro solo pueden ser modificados desde la base de datos.' 
        });
        return;
    }

    this.isEditing = true;
    this.tituloDialogo = 'Editar Usuario';
    this.limpiarForm();

    // 1. Manejo seguro de FECHA
    let fechaNac = null;
    if (usuario.fecha_nacimiento) {
        const parts = usuario.fecha_nacimiento.split('-'); 
        if(parts.length === 3) {
            fechaNac = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        }
    }

    // 2. Cargar datos básicos y foto
    this.userForm = { 
        ...usuario, 
        fecha_nacimiento: fechaNac, 
        password: '', 
        activo: usuario.activo ?? true 
    };

    this.previewUrl = usuario.foto_url || null;

    // 3. Cargar relaciones
    if (this.vistaActual === 'estudiantes' && usuario.estudiantes_posiciones) {
        this.userForm.posicionesIds = usuario.estudiantes_posiciones.map((p: any) => p.posicion_id);
    }

    if (this.vistaActual === 'profesores' && usuario.grupos_profesores) {
        this.userForm.gruposIds = usuario.grupos_profesores.map((g: any) => g.grupo_id);
    }

    // ✅ Cargar grupos del Kinesiólogo
    if (this.vistaActual === 'kinesiologos' && usuario.grupos_kine) {
        this.userForm.gruposIds = usuario.grupos_kine.map((g: any) => g.grupo_id);
    }

    this.displayDialog = true;
  }

  limpiarForm() {
    this.userForm = { 
        id: null, nombre: '', apellido: '', rut: '', email: '', password: '', 
        fecha_nacimiento: null, activo: true, grupo_id: null, tipo_profesor: '', 
        posicionesIds: [], gruposIds: [], 
        foto_url: null 
    };
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    this.uploadingFoto = false;
  }

  async guardar() {
    if (this.isEditing && this.userForm.rut === '1-1') {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Acción no permitida.' });
        return;
    }
    
    // Validaciones
    if (!this.userForm.nombre || !this.userForm.apellido || !this.userForm.email || !this.userForm.rut) {
        this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Completa todos los campos (*).' });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.userForm.email)) {
        this.messageService.add({ severity: 'error', summary: 'Email Inválido', detail: 'Formato incorrecto.' });
        return;
    }

    const rutLimpio = this.userForm.rut.replace(/\./g, '').trim();
    if (!RutValidator.esValido(rutLimpio)) {
        this.messageService.add({ severity: 'error', summary: 'RUT Inválido', detail: 'Formato incorrecto.' });
        return;
    }

    if (this.vistaActual === 'estudiantes' && !this.userForm.fecha_nacimiento) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan Datos', detail: 'La fecha es obligatoria.' });
        return;
    } else if (this.vistaActual === 'profesores' && !this.userForm.tipo_profesor) {
        this.messageService.add({ severity: 'warn', summary: 'Faltan Datos', detail: 'Especialidad obligatoria.' });
        return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
        let finalFotoUrl = this.userForm.foto_url;

        if (this.archivoSeleccionado) {
            this.uploadingFoto = true;
            const urlSubida = await this.supabase.subirFoto(this.archivoSeleccionado);
            if (urlSubida) {
                finalFotoUrl = urlSubida;
                this.cdr.detectChanges();
            }
            this.uploadingFoto = false;
            this.cdr.detectChanges();
        } 
        else if (this.previewUrl === null) {
            finalFotoUrl = null;
        }

        const { nombre, apellido, activo } = this.userForm;
        
        const datosBase: any = { 
            nombre, 
            apellido, 
            rut: this.userForm.rut, 
            activo,
            foto_url: finalFotoUrl 
        };

        if (this.vistaActual === 'estudiantes') {
            let fechaDb = null;
            if (this.userForm.fecha_nacimiento) {
                const d = this.userForm.fecha_nacimiento;
                const year = d.getFullYear();
                const month = ('0' + (d.getMonth() + 1)).slice(-2);
                const day = ('0' + d.getDate()).slice(-2);
                fechaDb = `${year}-${month}-${day}`;
            }
            datosBase.fecha_nacimiento = fechaDb;
            datosBase.grupo_id = this.userForm.grupo_id;
        
        } else if (this.vistaActual === 'profesores') {
            datosBase.tipo_profesor = this.userForm.tipo_profesor;
        }

        let userId = this.userForm.id;

        if (this.isEditing) {
            const { error } = await this.supabase.updateUsuario(
                this.vistaActual, userId, datosBase, this.userForm.email.toLowerCase()
            );
            if (error) throw error;
        } else {
            const generatedPassword = rutLimpio.replace(/-/g, '');
            const { data, error } = await this.supabase.crearUsuarioCompleto(
                this.userForm.email.toLowerCase(), generatedPassword, datosBase, this.vistaActual
            );
            if (error) throw error;
            userId = data?.user?.id;
        }

        // --- RELACIONES MANY-TO-MANY ---
        if (userId) {
            if (this.vistaActual === 'estudiantes') {
                await this.supabase.actualizarPosicionesEstudiante(userId, this.userForm.posicionesIds);
            }
            if (this.vistaActual === 'profesores') {
                await this.supabase.actualizarGruposProfesor(userId, this.userForm.gruposIds);
            }
            // ✅ Guardar grupos del Kinesiólogo
            if (this.vistaActual === 'kinesiologos') {
                const res = await this.supabase.getGruposDeKine(userId);
                const gruposViejos = res.data || [];
                for (let viejo of gruposViejos) {
                   await this.supabase.removerGrupoDeKine(userId, viejo.grupo_id);
                }
                for (let nuevoGrupoId of this.userForm.gruposIds) {
                   await this.supabase.asignarGrupoAKine(userId, nuevoGrupoId);
                }
            }
        }

        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado.' });
        this.displayDialog = false;
        
        setTimeout(() => this.cargarDatos(), 100);

    } catch (error: any) {
        console.error(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Error al guardar.' });
    } finally {
        this.loading = false;
        this.uploadingFoto = false;
        this.cdr.markForCheck(); 
    }
  }

  async toggleEstado(usuario: any) {
    if (usuario.rut === '1-1') {
      this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'No se puede desactivar al admin.' });
      return;
    }
    const accion = usuario.activo ? 'desactivar' : 'activar';
    this.confirmationService.confirm({
      message: `¿Deseas ${accion} a ${usuario.nombre} ${usuario.apellido}?`,
      header: 'Confirmar estado',
      icon: usuario.activo ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      acceptLabel: 'Sí', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: usuario.activo ? 'p-button-danger' : 'p-button-success',
      accept: async () => {
        const nuevoEstado = !usuario.activo;
        const datosUpdate: any = { 
            nombre: usuario.nombre, 
            apellido: usuario.apellido, 
            rut: usuario.rut, 
            activo: nuevoEstado,
            foto_url: usuario.foto_url
        };

        if (this.vistaActual === 'estudiantes') {
          datosUpdate.fecha_nacimiento = usuario.fecha_nacimiento;
          datosUpdate.grupo_id = usuario.grupo_id;
        } else if (this.vistaActual === 'profesores') {
          datosUpdate.tipo_profesor = usuario.tipo_profesor;
        }

        try {
          const { error } = await this.supabase.updateUsuario(this.vistaActual, usuario.id, datosUpdate, usuario.email);
          if (error) throw error;
          
          usuario.activo = nuevoEstado; 
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado.' });
          this.cdr.detectChanges();
        } catch (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar.' });
        }
      }
    });
  }

  async eliminar(usuario: any) {
    if (usuario.rut === '1-1') {
      this.messageService.add({ severity: 'error', summary: 'Denegado', detail: 'No se puede eliminar.' });
      return;
    }
    this.confirmationService.confirm({
      message: `¿Eliminar permanentemente a ${usuario.nombre}?`,
      header: 'Confirmar', icon: 'pi pi-trash',
      acceptLabel: 'Sí', acceptButtonStyleClass: 'p-button-danger', rejectLabel: 'Cancelar',
      accept: async () => {
        const { error } = await this.supabase.deleteUsuario(this.vistaActual, usuario.id);
        if (!error) {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario borrado.' });
          this.cargarDatos();
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' });
        }
      }
    });
  }

  getGrupoNombre(grupoId: any): string {
    const grupo = this.listaGrupos.find(g => g.id === grupoId);
    return grupo ? grupo.nombre : 'Desconocido';
  }
}