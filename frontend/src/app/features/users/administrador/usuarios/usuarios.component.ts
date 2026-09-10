import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';

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

import { FilterService, ConfirmationService, MessageService } from 'primeng/api';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { RutFormatDirective } from '../../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../../shared/directives/rut-validator.directive';

import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { CrearUsuarioPayload, ActualizarUsuarioPayload } from '../../../../core/domains/usuarios/central/models/usuario.interface'
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';

// 🔥 IMPORTAMOS EL SERVICIO DE ASIGNACIÓN DE STAFF
import { AsignacionStaffService } from '../../../../core/domains/academico/asignaciones-staff/services/asignacion-staff.service';
import { TipoStaff } from '../../../../core/domains/academico/asignaciones-staff/models/asignacion-staff.interface';

import { ExcelExportService } from '../../../../core/services/excel-export.service';

import { Rol } from '../../../../shared/enums/rol.enum';
import { Posicion } from '../../../../shared/enums/posicion.enum';
import { Genero } from '../../../../shared/enums/genero.enum';

@Component({
  selector: 'app-administrador-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, 
    InputTextModule, InputNumberModule, ConfirmDialogModule, SelectModule, MultiSelectModule, 
    ToastModule, TagModule, CheckboxModule, TooltipModule, DatePickerModule,
    FileUploadModule, RutFormatDirective
  ],
  providers: [ConfirmationService, MessageService, FilterService],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class AdministradorUsuariosComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  private usuarioService = inject(UsuarioService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private asignacionStaffService = inject(AsignacionStaffService); // 🔥 INYECTADO
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private filterService = inject(FilterService);
  private excelService = inject(ExcelExportService);

  dataList: any[] = []; 
  listaGrupos: any[] = [];
  listaPosiciones: any[] = [
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

  opcionesGenero = [
    { label: 'Masculino', value: Genero.MASCULINO },
    { label: 'Femenino', value: Genero.FEMENINO }
  ];

  listaTiposProfesor = [
    { label: 'Profesor de Fútbol', value: 'profesor de futbol' },
    { label: 'Preparador Físico', value: 'preparador fisico' }
  ];

  filtros: any = { global: '', grupo: null, posicion: null, tipoProfesor: null, estado: null, generos: null };

  loading: boolean = false;
  guardando: boolean = false;
  displayDialog: boolean = false;
  isEditing: boolean = false;
  tituloDialogo: string = '';
  maxDate: Date = new Date(); 

  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;
  uploadingFoto: boolean = false;

  displayFicha: boolean = false;
  selectedEstudianteFicha: any = null;
  historialClinico: any[] = [];
  loadingHistorial: boolean = false;

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
      next: (data) => {
        Promise.resolve().then(() => {
            this.listaGrupos = data;
            this.cdr.detectChanges();
        });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Aviso', detail: 'No se pudieron cargar los grupos' })
    });
  }

  cambiarVista() { 
    this.limpiarFiltros();
    this.cargarDatos(); 
  }

  // 🔥 Verifica si la vista actual es de un perfil de Staff (Profe, Kine, Nutri)
  esVistaStaff(): boolean {
    return this.vistaActual === Rol.PROFESOR || 
           this.vistaActual === Rol.KINESIOLOGO || 
           this.vistaActual === Rol.NUTRICIONISTA;
  }

  // 🔥 Mapea el Rol a TipoStaff para las peticiones de asignación
  getTipoStaff(): TipoStaff | null {
    if (this.vistaActual === Rol.PROFESOR) return TipoStaff.PROFESOR;
    if (this.vistaActual === Rol.KINESIOLOGO) return TipoStaff.KINESIOLOGO;
    if (this.vistaActual === Rol.NUTRICIONISTA) return TipoStaff.NUTRICIONISTA;
    return null;
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, tipoProfesor: null, estado: null, generos: null };
    if (this.dt) this.dt.reset();
  }

  cargarDatos() {
    this.loading = true;
    this.dataList = [];

    this.usuarioService.listarUsuarios({ rol: this.vistaActual, limite: 200 }).subscribe({
      next: (res) => {
        this.dataList = res.registros.map(user => {
          // 🔥 FIX: Buscamos todas las posibles formas en las que el backend pueda devolver la relación
          const gruposRelacion = user.grupos_asignados || user.grupos_profesores || user.grupos_kinesiologos || user.grupos_nutricionistas || [];
          
          // 🔥 FIX: Extraemos el ID y forzamos a que sea Número para que PrimeNG lo reconozca
          const idsGrupos = gruposRelacion
            .map((g: any) => Number(g.grupo_id || g.id || g))
            .filter((id: number) => !isNaN(id));

          return {
            ...user,
            grupo_id: user.datosEstudiante?.grupo_id,
            posiciones: user.datosEstudiante?.posiciones || [],
            tipo_profesor: user.datosProfesor?.tipo_profesor,
            peso: user.datosEstudiante?.peso,
            altura: user.datosEstudiante?.altura,
            prevision: user.datosEstudiante?.prevision,
            direccion: user.datosEstudiante?.direccion,
            // Guardamos el arreglo limpio y estrictamente numérico
            gruposIds: idsGrupos
          };
        });
        
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

  descargarExcel() {
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando directorio completo...' });
    this.cdr.detectChanges();
    this.excelService.exportarUsuarios({});
  }

  // --- LÓGICA DE FOTOS ---
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
  }

  // --- LÓGICA DE FORMULARIO ---
  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Usuario';
    this.limpiarForm();
    this.displayDialog = true;
  }

  abrirEditar(usuario: any) {
    console.log('Usuario recibido del backend:', usuario);
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
      posicionesIds: usuario.posiciones || [],
      // 🔥 Pasamos el arreglo de IDs que ya limpiamos y convertimos a número en cargarDatos()
      gruposIds: [...(usuario.gruposIds || [])],
      gruposIdsOriginales: [...(usuario.gruposIds || [])]
    };
    
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
      genero: null, // 🔥 NUEVO CAMPO
      grupo_id: null, tipo_profesor: '', posicionesIds: [], direccion: '', prevision: '', peso: null, altura: null,
      gruposIds: [], gruposIdsOriginales: []
    };
  }

  guardar() {
    if (this.guardando) return;

    if (this.isEditing && this.userForm.rut === '1-1') return;

    if (!this.userForm.nombre || !this.userForm.apellido || !this.userForm.email || !this.userForm.rut || !this.userForm.genero) {
        this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Completa todos los campos obligatorios (*).' }); return;
    }
    
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

    this.guardando = true;

    const payload: any = {
      rut: rutLimpio,
      nombre: this.userForm.nombre,
      apellido: this.userForm.apellido,
      email: this.userForm.email.toLowerCase(),
      genero: this.userForm.genero,
    };

    if (!this.isEditing) {
      payload.rol = this.vistaActual;
    }

    if (this.userForm.fecha_nacimiento) {
      payload.fechaNacimiento = this.formatearFecha(this.userForm.fecha_nacimiento);
    }

    if (this.vistaActual === Rol.ESTUDIANTE) {
      if (this.userForm.peso !== null && this.userForm.peso !== '') payload.peso = this.userForm.peso;
      if (this.userForm.altura !== null && this.userForm.altura !== '') payload.altura = this.userForm.altura;
      if (this.userForm.posicionesIds && this.userForm.posicionesIds.length > 0) payload.posiciones = this.userForm.posicionesIds;
      if (this.userForm.grupo_id !== null && this.userForm.grupo_id !== '') payload.grupoId = this.userForm.grupo_id;
      if (this.userForm.direccion && this.userForm.direccion.trim() !== '') payload.direccion = this.userForm.direccion;
      if (this.userForm.prevision && this.userForm.prevision.trim() !== '') payload.prevision = this.userForm.prevision;
    } else if (this.vistaActual === Rol.PROFESOR) {
      if (this.userForm.tipo_profesor && this.userForm.tipo_profesor.trim() !== '') {
        payload.tipoProfesor = this.userForm.tipo_profesor;
      }
    }

    // 🔥 Modificamos el flujo para que pase por procesarGruposYFoto
    if (this.isEditing) {
      this.usuarioService.actualizarUsuario(this.userForm.id, payload as ActualizarUsuarioPayload).subscribe({
        next: (res) => this.procesarGruposYFoto(this.userForm.id, 'Usuario actualizado con éxito'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    } else {
      payload.passwordTemporal = rutLimpio.replace(/-/g, '');
      this.usuarioService.crearUsuario(payload as CrearUsuarioPayload).subscribe({
        next: (res) => this.procesarGruposYFoto(res.id_usuario, 'Usuario creado con éxito'),
        error: (err) => this.mostrarErrorGuardado(err)
      });
    }
  }

  // 🔥 NUEVO: Procesa la asignación múltiple de grupos para el Staff antes de subir la foto
  private procesarGruposYFoto(userId: string, mensaje: string) {
    const tipoStaff = this.getTipoStaff();
    
    if (tipoStaff) {
      const originales = this.userForm.gruposIdsOriginales || [];
      const nuevos = this.userForm.gruposIds || [];
      
      const gruposParaAgregar = nuevos.filter((id: number) => !originales.includes(id));
      const gruposParaQuitar = originales.filter((id: number) => !nuevos.includes(id));

      const peticiones: Observable<any>[] = [];

      gruposParaAgregar.forEach((grupoId: number) => {
        peticiones.push(this.asignacionStaffService.asignarStaff(grupoId, tipoStaff, { usuarioId: userId }));
      });

      gruposParaQuitar.forEach((grupoId: number) => {
        peticiones.push(this.asignacionStaffService.desasignarStaff(grupoId, tipoStaff, userId));
      });

      if (peticiones.length > 0) {
        forkJoin(peticiones).subscribe({
          next: () => this.procesarFotoYFinalizar(userId, mensaje),
          error: () => this.procesarFotoYFinalizar(userId, mensaje + ' (Nota: Hubo un problema al actualizar algunos grupos asignados)')
        });
        return; // Salimos para esperar la respuesta del forkJoin
      }
    }
    
    // Si no es Staff o no hubieron cambios de grupo, pasamos a la foto directo
    this.procesarFotoYFinalizar(userId, mensaje);
  }

  private procesarFotoYFinalizar(userId: string, mensaje: string) {
    if (this.archivoSeleccionado) {
      this.uploadingFoto = true;
      this.usuarioService.actualizarFoto(userId, this.archivoSeleccionado).subscribe({
        next: () => this.finalizarGuardado(mensaje),
        error: () => this.finalizarGuardado(mensaje + ' (Pero no se pudo subir la foto)')
      });
    } else if (this.isEditing && !this.previewUrl) {
      this.usuarioService.eliminarFoto(userId).subscribe({
        next: () => this.finalizarGuardado(mensaje),
        error: () => this.finalizarGuardado(mensaje + ' (Pero no se pudo eliminar la foto anterior)')
      });
    } else {
      this.finalizarGuardado(mensaje);
    }
  }

  private finalizarGuardado(mensaje: string) {
    this.guardando = false;
    this.uploadingFoto = false;
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.cargarDatos();
  }

  private mostrarErrorGuardado(err: any) {
    this.guardando = false;
    let errorDetalle = 'Error al procesar la solicitud';
    if (err.error?.message) {
      errorDetalle = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
    }
    this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail: errorDetalle, life: 6000 });
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
}