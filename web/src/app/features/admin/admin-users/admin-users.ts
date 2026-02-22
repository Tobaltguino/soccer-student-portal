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
import { FileUploadModule } from 'primeng/fileupload'; // ✅ NUEVO IMPORT

// Services & Directives
import { FilterService, ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../shared/directives/rut-validator.directive';


@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, ConfirmDialogModule, SelectModule, MultiSelectModule, 
    ToastModule, TagModule, CheckboxModule, TooltipModule, DatePickerModule,
    FileUploadModule, // ✅ AGREGADO
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

  // --- VARIABLES PARA FOTOS (NUEVO) ---
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
    foto_url: null // ✅
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
        case 'kinesiologos': res = await this.supabase.getKinesiologos(); break;
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

  // --- GESTIÓN DE FOTOS (NUEVO) ---

  onFileSelected(event: any) {
    const file = event.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        // 🚀 Despertamos a Angular para que muestre la imagen de inmediato
        this.cdr.detectChanges(); 
      };
      reader.readAsDataURL(file);
    }
  }

  clearFoto() {
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    this.userForm.foto_url = null; // Marcar como null para borrar en DB al guardar
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
            detail: 'Los datos del administrador maestro solo pueden ser modificados desde la base de datos por seguridad.' 
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

    // ✅ Cargar preview
    this.previewUrl = usuario.foto_url || null;

    // 3. Cargar relaciones
    if (this.vistaActual === 'estudiantes' && usuario.estudiantes_posiciones) {
        this.userForm.posicionesIds = usuario.estudiantes_posiciones.map((p: any) => p.posicion_id);
    }

    if (this.vistaActual === 'profesores' && usuario.grupos_profesores) {
        this.userForm.gruposIds = usuario.grupos_profesores.map((g: any) => g.grupo_id);
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
    // Limpiar estados de foto
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    this.uploadingFoto = false;
  }

  async guardar() {
    if (this.isEditing && this.userForm.rut === '1-1') {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Acción no permitida para esta cuenta.' });
        return;
    }
    // 1. VALIDACIONES BÁSICAS (Campos comunes)
    if (!this.userForm.nombre || !this.userForm.apellido || !this.userForm.email || !this.userForm.rut) {
        this.messageService.add({ severity: 'warn', summary: 'Campos Incompletos', detail: 'Por favor completa todos los campos marcados con *.' });
        return;
    }

    // 2. VALIDACIÓN DE EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.userForm.email)) {
        this.messageService.add({ severity: 'error', summary: 'Email Inválido', detail: 'Ingresa un correo electrónico con formato válido.' });
        return;
    }

    // 3. VALIDACIÓN DE RUT
    const rutLimpio = this.userForm.rut.replace(/\./g, '').trim();
    if (!RutValidator.esValido(rutLimpio)) {
        this.messageService.add({ severity: 'error', summary: 'RUT Inválido', detail: 'El formato del RUT no es correcto o no existe.' });
        return;
    }

    // 4. VALIDACIONES ESPECÍFICAS POR ROL
    if (this.vistaActual === 'estudiantes') {
        if (!this.userForm.fecha_nacimiento) {
            this.messageService.add({ severity: 'warn', summary: 'Faltan Datos', detail: 'La fecha de nacimiento es obligatoria para los estudiantes.' });
            return;
        }
    } else if (this.vistaActual === 'profesores') {
        if (!this.userForm.tipo_profesor) {
            this.messageService.add({ severity: 'warn', summary: 'Faltan Datos', detail: 'La especialidad es obligatoria para los profesores.' });
            return;
        }
    }

    // --- Si pasa todas las validaciones, procedemos a guardar ---
    this.loading = true;
    this.cdr.detectChanges();

    try {
        // 5. SUBIR FOTO SI CORRESPONDE
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
        
        // Objeto base usando el rutLimpio
        // Objeto base usando el rut original del formulario
        const datosBase: any = { 
            nombre, 
            apellido, 
            rut: this.userForm.rut, // ✅ AHORA SÍ (se guarda con puntos y guion)
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
            // EDITAR
            const { error } = await this.supabase.updateUsuario(
                this.vistaActual, 
                userId, 
                datosBase, 
                this.userForm.email.toLowerCase()
            );
            if (error) throw error;

        } else {
            // CREAR
            // Contraseña sin puntos ni guiones (usando el rutLimpio ya validado)
            const generatedPassword = rutLimpio.replace(/-/g, '');

            const { data, error } = await this.supabase.crearUsuarioCompleto(
                this.userForm.email.toLowerCase(), 
                generatedPassword, 
                datosBase, 
                this.vistaActual
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
        }

        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado correctamente' });
        this.displayDialog = false;
        
        setTimeout(() => this.cargarDatos(), 100);

    } catch (error: any) {
        console.error(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Error al guardar usuario' });
    } finally {
        this.loading = false;
        this.uploadingFoto = false;
        this.cdr.markForCheck(); 
    }
}

  // --- ACCIONES DE ESTADO Y ELIMINAR ---

  async toggleEstado(usuario: any) {
    if (usuario.rut === '1-1') {
      this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'No se puede desactivar al administrador maestro.' });
      return;
    }
    const accion = usuario.activo ? 'desactivar' : 'activar';
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${accion} la cuenta de ${usuario.nombre} ${usuario.apellido}?`,
      header: 'Confirmar estado',
      icon: usuario.activo ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: usuario.activo ? 'p-button-danger' : 'p-button-success',
      accept: async () => {
        const nuevoEstado = !usuario.activo;
        
        // Mantener foto y datos al cambiar estado
        const datosUpdate: any = { 
            nombre: usuario.nombre, 
            apellido: usuario.apellido, 
            rut: usuario.rut, 
            activo: nuevoEstado,
            foto_url: usuario.foto_url // ✅ Mantener foto
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
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado.' });
        }
      }
    });
  }

  async eliminar(usuario: any) {
    if (usuario.rut === '1-1') {
      this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'El administrador maestro no puede ser eliminado.' });
      return;
    }
    this.confirmationService.confirm({
      message: `¿Eliminar permanentemente a ${usuario.nombre} ${usuario.apellido}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: async () => {
        const { error } = await this.supabase.deleteUsuario(this.vistaActual, usuario.id);
        if (!error) {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario borrado permanentemente.' });
          this.cargarDatos();
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el usuario.' });
        }
      }
    });
  }
}