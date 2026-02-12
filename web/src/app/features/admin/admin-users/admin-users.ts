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

// Services & Directives
import { FilterService, ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, ConfirmDialogModule, SelectModule, MultiSelectModule, 
    ToastModule, TagModule, CheckboxModule, TooltipModule, DatePickerModule,
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
  maxDate: Date = new Date(); // Para limitar fecha nacimiento a hoy

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
    posicionesIds: [], // Array de IDs para el MultiSelect
    gruposIds: []      // Array de IDs para el MultiSelect (Profesores)
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

  // Permite filtrar por "contiene una posición" en el array de posiciones
  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (filter === undefined || filter === null || filter.length === 0) return true;
      if (value === undefined || value === null) return false;
      // value es el array de objetos {posicion_id, ...}
      // filter es el array de IDs seleccionados [1, 2]
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
    const born = new Date(fecha); // Ojo: aquí asume formato YYYY-MM-DD estándar
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    const monthDiff = today.getMonth() - born.getMonth();
    // Ajuste fino por día
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--;
    return age;
  }

  // --- ABM (CRUD) ---

  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarForm();
    this.displayDialog = true;
  }

  abrirEditar(usuario: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Usuario';
    this.limpiarForm();

    // 1. Manejo seguro de FECHA (Evita error de zona horaria)
    let fechaNac = null;
    if (usuario.fecha_nacimiento) {
        // Convertimos '2010-05-15' a una fecha local correcta [Año, Mes (0-index), Día]
        const parts = usuario.fecha_nacimiento.split('-'); 
        // new Date(año, mes-1, dia) crea la fecha en hora local (00:00:00 local)
        if(parts.length === 3) {
            fechaNac = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        }
    }

    // 2. Cargar datos básicos
    this.userForm = { 
        ...usuario, 
        fecha_nacimiento: fechaNac, 
        password: '', // No cargamos la contraseña hash
        activo: usuario.activo ?? true 
    };

    // 3. Cargar relaciones (Estudiantes -> Posiciones)
    if (this.vistaActual === 'estudiantes' && usuario.estudiantes_posiciones) {
        // Mapeamos el array de objetos [{posicion_id:1}] a array de números [1]
        this.userForm.posicionesIds = usuario.estudiantes_posiciones.map((p: any) => p.posicion_id);
    }

    // 4. Cargar relaciones (Profesores -> Grupos)
    if (this.vistaActual === 'profesores' && usuario.grupos_profesores) {
        this.userForm.gruposIds = usuario.grupos_profesores.map((g: any) => g.grupo_id);
    }

    this.displayDialog = true;
  }

  limpiarForm() {
    this.userForm = { 
        id: null, nombre: '', apellido: '', rut: '', email: '', password: '', 
        fecha_nacimiento: null, activo: true, grupo_id: null, tipo_profesor: '', 
        posicionesIds: [], gruposIds: [] 
    };
  }

  async guardar() {
    if (!this.userForm.email) {
        this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El email es obligatorio' });
        return;
    }
    
    this.loading = true;
    this.cdr.detectChanges();

    try {
        const { nombre, apellido, rut, activo } = this.userForm;
        
        // Objeto base que irá a la tabla específica
        const datosBase: any = { nombre, apellido, rut, activo };

        // Lógica específica por Rol
        if (this.vistaActual === 'estudiantes') {
            let fechaDb = null;
            if (this.userForm.fecha_nacimiento) {
                // Formatear Date object a string YYYY-MM-DD usando hora local
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
            // CREAR (Auth + DB)
            const { data, error } = await this.supabase.crearUsuarioCompleto(
                this.userForm.email.toLowerCase(), 
                this.userForm.password, 
                datosBase, 
                this.vistaActual
            );
            if (error) throw error;
            userId = data?.user?.id; // Capturamos el nuevo ID
        }

        // --- ACTUALIZAR RELACIONES MANY-TO-MANY ---
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
        
        // Recargar datos (pequeño delay para asegurar consistencia DB)
        setTimeout(() => this.cargarDatos(), 100);

    } catch (error: any) {
        console.error(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Error al guardar usuario' });
    } finally {
        this.loading = false;
        this.cdr.markForCheck(); 
    }
  }

  // --- ACCIONES DE ESTADO Y ELIMINAR ---

  async toggleEstado(usuario: any) {
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
        
        // Reconstruimos el objeto update mínimo necesario
        const datosUpdate: any = { 
            nombre: usuario.nombre, 
            apellido: usuario.apellido, 
            rut: usuario.rut, 
            activo: nuevoEstado 
        };

        // Si es estudiante, necesitamos pasar campos obligatorios si la DB los exige en update (raro, pero seguro)
        if (this.vistaActual === 'estudiantes') {
          datosUpdate.fecha_nacimiento = usuario.fecha_nacimiento;
          datosUpdate.grupo_id = usuario.grupo_id;
        } else if (this.vistaActual === 'profesores') {
          datosUpdate.tipo_profesor = usuario.tipo_profesor;
        }

        try {
          const { error } = await this.supabase.updateUsuario(this.vistaActual, usuario.id, datosUpdate, usuario.email);
          if (error) throw error;
          
          usuario.activo = nuevoEstado; // Actualizar vista localmente
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado.' });
          this.cdr.detectChanges();
        } catch (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado.' });
        }
      }
    });
  }

  async eliminar(usuario: any) {
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