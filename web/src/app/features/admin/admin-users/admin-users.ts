import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    DialogModule, InputTextModule, ConfirmDialogModule, SelectModule,
    MultiSelectModule, ToastModule, TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css']
})
export class AdminUsersComponent implements OnInit {

  // --- DATOS MAESTROS ---
  estudiantes: any[] = [];
  profesores: any[] = [];
  admins: any[] = [];
  kines: any[] = [];
  nutris: any[] = [];
  listaGrupos: any[] = [];

  // --- LISTAS FILTRADAS ---
  estudiantesFiltrados: any[] = [];
  profesoresFiltrados: any[] = [];

  // --- CONTROL DE VISTA (Reemplaza a Tabs) ---
  vistaActual: string = 'estudiantes'; // Valor por defecto

  tiposUsuario = [
    { label: 'Estudiantes', value: 'estudiantes' },
    { label: 'Profesores', value: 'profesores' },
    { label: 'Administradores', value: 'admins' },
    { label: 'Kinesiólogos', value: 'kinesiologos' },
    { label: 'Nutricionistas', value: 'nutricionistas' }
  ];

  // --- FILTROS ---
  filtroGrupoEst: any = null;
  filtroTipoEst: any = null;
  filtroGrupoProf: any = null;
  filtroTipoProf: any = null;

  // --- ESTADOS DE CARGA ---
  loadingEstudiantes: boolean = false;
  loadingProfesores: boolean = false;
  loadingAdmins: boolean = false;
  loadingKines: boolean = false;
  loadingNutris: boolean = false;

  displayDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';

  // --- LISTAS ESTÁTICAS ---
  tiposJugador: any[] = [
    { label: 'Jugador de Campo', value: 'Jugador de Campo' },
    { label: 'Arquero', value: 'Arquero' }
  ];

  // --- FORMULARIO ---
  userForm: any = {
    id: null, nombre: '', apellido: '', rut: '', email: '', password: '', 
    tipo_alumno: '', tipo_profesor: '', grupo_id: null, grupos_profe: []
  };

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.cargarListaGrupos();
    this.cambiarVista(); // Carga la vista inicial (estudiantes)
  }

  // ================= CONTROL DE VISTA =================
  cambiarVista() {
    // Cargar datos solo si es necesario al cambiar de vista
    switch (this.vistaActual) {
      case 'estudiantes': if(this.estudiantes.length === 0) this.cargarEstudiantes(); break;
      case 'profesores': if(this.profesores.length === 0) this.cargarProfesores(); break;
      case 'admins': if(this.admins.length === 0) this.cargarAdmins(); break;
      case 'kinesiologos': if(this.kines.length === 0) this.cargarKines(); break;
      case 'nutricionistas': if(this.nutris.length === 0) this.cargarNutris(); break;
    }
  }

  // ================= CARGA DE DATOS =================
  async cargarListaGrupos() {
    const { data } = await this.supabase.getGrupos();
    if (data) this.listaGrupos = data;
  }

  async cargarEstudiantes() {
    this.loadingEstudiantes = true;
    const { data } = await this.supabase.getEstudiantes();
    if (data) {
        this.estudiantes = data;
        this.filtrarEstudiantes();
    }
    this.loadingEstudiantes = false;
    this.cdr.detectChanges();
  }
  
  async cargarProfesores() {
    this.loadingProfesores = true;
    const { data } = await this.supabase.getProfesores();
    if (data) {
        this.profesores = data;
        this.filtrarProfesores();
    }
    this.loadingProfesores = false;
    this.cdr.detectChanges();
  }

  async cargarAdmins() {
    this.loadingAdmins = true;
    const { data } = await this.supabase.getAdmins();
    if (data) this.admins = data;
    this.loadingAdmins = false;
    this.cdr.detectChanges();
  }

  async cargarKines() {
    this.loadingKines = true;
    const { data } = await this.supabase.getKinesiologos();
    if (data) this.kines = data;
    this.loadingKines = false;
    this.cdr.detectChanges();
  }

  async cargarNutris() {
    this.loadingNutris = true;
    const { data } = await this.supabase.getNutricionistas();
    if (data) this.nutris = data;
    this.loadingNutris = false;
    this.cdr.detectChanges();
  }

  // ================= FILTROS =================
  filtrarEstudiantes() {
    this.estudiantesFiltrados = this.estudiantes.filter(e => {
      const matchGrupo = this.filtroGrupoEst ? e.grupo_id === this.filtroGrupoEst : true;
      const matchTipo = this.filtroTipoEst ? e.tipo_alumno === this.filtroTipoEst : true;
      return matchGrupo && matchTipo;
    });
  }

  limpiarFiltrosEst() {
    this.filtroGrupoEst = null;
    this.filtroTipoEst = null;
    this.filtrarEstudiantes();
  }

  filtrarProfesores() {
    this.profesoresFiltrados = this.profesores.filter(p => {
      const matchGrupo = this.filtroGrupoProf 
        ? p.grupos_profesores.some((gp: any) => gp.grupo_id === this.filtroGrupoProf)
        : true;
      const matchTipo = this.filtroTipoProf ? p.tipo_profesor === this.filtroTipoProf : true;
      return matchGrupo && matchTipo;
    });
  }

  limpiarFiltrosProf() {
    this.filtroGrupoProf = null;
    this.filtroTipoProf = null;
    this.filtrarProfesores();
  }

  // ================= DIÁLOGO (CRUD) =================
  abrirDialogoCrear() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarFormulario();
    
    // Pre-seleccionar tipo según la vista actual
    // Nota: Para estudiantes/profesores el tipo específico se elige en el form
    this.displayDialog = true;
  }

  abrirDialogoEditar(usuario: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Usuario';
    
    // Copiar datos
    this.userForm = { ...usuario, password: '' };

    // Lógica específica por tipo
    if (this.vistaActual === 'estudiantes') {
       this.userForm.grupo_id = usuario.grupo_id || null;
    }
    if (this.vistaActual === 'profesores') {
       if (usuario.grupos_profesores && usuario.grupos_profesores.length > 0) {
           this.userForm.grupos_profe = usuario.grupos_profesores.map((g: any) => g.grupo_id);
       } else {
           this.userForm.grupos_profe = [];
       }
    }
    this.displayDialog = true;
  }

  limpiarFormulario() {
    this.userForm = {
      id: null, nombre: '', apellido: '', rut: '', email: '', password: '', 
      tipo_alumno: '', tipo_profesor: '', grupo_id: null, grupos_profe: []
    };
  }

  async guardarUsuario() {
    if (!this.userForm.email) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El email es obligatorio' });
      return;
    }
    if (!this.isEditing && !this.userForm.password) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'La contraseña es obligatoria' });
      return;
    }

    const tabla = this.vistaActual; // La tabla coincide con el value del dropdown
    
    const datosBase: any = {
      nombre: this.userForm.nombre,
      apellido: this.userForm.apellido,
      rut: this.userForm.rut
    };

    if (this.vistaActual === 'estudiantes') {
        datosBase['tipo_alumno'] = this.userForm.tipo_alumno;
        datosBase['grupo_id'] = this.userForm.grupo_id;
    } 
    else if (this.vistaActual === 'profesores') {
        datosBase['tipo_profesor'] = this.userForm.tipo_profesor;
    }

    let userIdResult = this.userForm.id;
    let errorResult = null;

    try {
      if (this.isEditing) {
        const { error } = await this.supabase.adminUpdateUsuario(tabla, this.userForm.id, this.userForm.email, datosBase);
        errorResult = error;
        
        // Actualización especial para grupos de profesores
        if (!error && this.vistaActual === 'profesores') {
            await this.supabase.actualizarGruposProfesor(this.userForm.id, this.userForm.grupos_profe);
        }

      } else {
        const res: any = await this.supabase.crearUsuarioCompleto(this.userForm.email, this.userForm.password, datosBase, tabla);
        userIdResult = res.data?.user?.id;
        errorResult = res.error;

        // Creación especial para grupos de profesores
        if (!errorResult && this.vistaActual === 'profesores' && userIdResult) {
            await this.supabase.actualizarGruposProfesor(userIdResult, this.userForm.grupos_profe);
        }
      }

      if (errorResult) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorResult.message });
      } else {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.isEditing ? 'Usuario actualizado.' : 'Usuario creado.' });
        this.displayDialog = false;
        this.recargarTablaActual();
      }

    } catch (e) {
      console.error(e);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error inesperado.' });
    }
  }

  eliminarUsuario(id: any, tabla: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este usuario?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      accept: async () => {
        const { error } = await this.supabase.deleteUsuario(tabla, id);
        if (error) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
        } else {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario eliminado.' });
            this.recargarTablaActual();
        }
      }
    });
  }

  recargarTablaActual() {
    switch(this.vistaActual) {
        case 'estudiantes': this.cargarEstudiantes(); break;
        case 'profesores': this.cargarProfesores(); break;
        case 'admins': this.cargarAdmins(); break;
        case 'kinesiologos': this.cargarKines(); break;
        case 'nutricionistas': this.cargarNutris(); break;
    }
  }
}