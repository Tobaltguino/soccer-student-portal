import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports (v18+)
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';       // Selector Simple
import { MultiSelectModule } from 'primeng/multiselect'; // Selector Múltiple
import { ToastModule } from 'primeng/toast';         // Notificaciones
import { TooltipModule } from 'primeng/tooltip';     // Tooltips
import { ConfirmationService, MessageService } from 'primeng/api';

import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    TabsModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
    TooltipModule
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

  // --- LISTAS FILTRADAS (Vista de tabla) ---
  estudiantesFiltrados: any[] = [];
  profesoresFiltrados: any[] = [];

  // --- VARIABLES DE FILTRO ---
  filtroGrupoEst: any = null;
  filtroTipoEst: any = null;
  
  filtroGrupoProf: any = null;
  filtroTipoProf: any = null;

  // --- ESTADOS ---
  loadingEstudiantes: boolean = true;
  loadingProfesores: boolean = true;
  loadingAdmins: boolean = true;
  loadingKines: boolean = true;
  loadingNutris: boolean = true;

  displayDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';
  activeTab: string = '0'; 

  // --- LISTAS ESTÁTICAS ---
  tiposJugador: any[] = [
    { label: 'Jugador de Campo', value: 'Jugador de Campo' },
    { label: 'Arquero', value: 'Arquero' }
  ];

  // --- FORMULARIO ---
  userForm: any = {
    id: null,
    nombre: '',
    apellido: '',
    rut: '',
    email: '',
    password: '',
    tipo_alumno: '',     
    tipo_profesor: '',   
    grupo_id: null,      
    grupos_profe: []     
  };

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.cargarTodo();
    this.cargarListaGrupos();
  }

  // ================= CARGA DE DATOS =================
  cargarTodo() {
    this.cargarEstudiantes();
    this.cargarProfesores();
    this.cargarAdmins();
    this.cargarKines();
    this.cargarNutris();
  }

  async cargarListaGrupos() {
    const { data } = await this.supabase.getGrupos();
    if (data) this.listaGrupos = data;
  }

  async cargarEstudiantes() {
    this.loadingEstudiantes = true;
    const { data } = await this.supabase.getEstudiantes();
    if (data) {
        this.estudiantes = data;
        this.filtrarEstudiantes(); // Inicializar filtro
    }
    this.loadingEstudiantes = false;
    this.cdr.detectChanges();
  }
  
  async cargarProfesores() {
    this.loadingProfesores = true;
    const { data } = await this.supabase.getProfesores();
    if (data) {
        this.profesores = data;
        this.filtrarProfesores(); // Inicializar filtro
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

  // ================= LÓGICA DE FILTROS =================
  
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
      // Verifica si alguno de los grupos del profe coincide con el filtro
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

  // ================= DIÁLOGO =================
  
  abrirDialogoCrear() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarFormulario();
    this.displayDialog = true;
  }

  abrirDialogoEditar(usuario: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Usuario';
    
    this.userForm = { ...usuario, password: '' };

    // Rellenar Grupos
    if (this.activeTab === '0') {
       this.userForm.grupo_id = usuario.grupo_id || null;
    }
    if (this.activeTab === '1') {
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

  // ================= CRUD =================
  async guardarUsuario() {
    if (!this.userForm.email) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El email es obligatorio' });
      return;
    }
    if (!this.isEditing && !this.userForm.password) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'La contraseña es obligatoria' });
      return;
    }

    const tabla = this.obtenerNombreTabla(this.activeTab);
    
    const datosBase: any = {
      nombre: this.userForm.nombre,
      apellido: this.userForm.apellido,
      rut: this.userForm.rut
    };

    if (this.activeTab === '0') {
        datosBase['tipo_alumno'] = this.userForm.tipo_alumno;
        datosBase['grupo_id'] = this.userForm.grupo_id;
    } 
    else if (this.activeTab === '1') {
        datosBase['tipo_profesor'] = this.userForm.tipo_profesor;
    }

    let userIdResult = this.userForm.id;
    let errorResult = null;

    try {
      if (this.isEditing) {
        const { error } = await this.supabase.adminUpdateUsuario(tabla, this.userForm.id, this.userForm.email, datosBase);
        errorResult = error;
      } else {
        const res: any = await this.supabase.crearUsuarioCompleto(this.userForm.email, this.userForm.password, datosBase, tabla);
        userIdResult = res.data?.user?.id;
        errorResult = res.error;
      }

      if (!errorResult && this.activeTab === '1' && userIdResult) {
          await this.supabase.actualizarGruposProfesor(userIdResult, this.userForm.grupos_profe);
      }

      if (errorResult) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorResult.message });
      } else {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.isEditing ? 'Usuario actualizado.' : 'Usuario creado.' });
        this.displayDialog = false;
        this.recargarTabla(this.activeTab);
      }

    } catch (e) {
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
            this.recargarTabla(this.obtenerIndiceTabla(tabla));
        }
      }
    });
  }

  // ================= UTILS =================
  obtenerNombreTabla(index: string): string {
    const map = ['estudiantes', 'profesores', 'admins', 'kinesiologos', 'nutricionistas'];
    return map[parseInt(index)] || 'estudiantes';
  }

  obtenerIndiceTabla(nombre: string): string {
    const map: any = { 'estudiantes': '0', 'profesores': '1', 'admins': '2', 'kinesiologos': '3', 'nutricionistas': '4' };
    return map[nombre] || '0';
  }

  recargarTabla(index: string) {
    if(index === '0') this.cargarEstudiantes();
    if(index === '1') this.cargarProfesores();
    if(index === '2') this.cargarAdmins();
    if(index === '3') this.cargarKines();
    if(index === '4') this.cargarNutris();
  }
}