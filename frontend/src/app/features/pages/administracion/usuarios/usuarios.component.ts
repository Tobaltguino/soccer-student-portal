import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

// Directivas y Core
import { RutFormatDirective } from '../../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../../shared/directives/rut-validator.directive';
import { ExcelExportService } from '../../../../core/services/excel-export.service';

// Servicios y Modelos Locales (Mismo módulo: usuarios)
import { UsuarioCentralService } from './services/usuarios-central.service';
import { CrearUsuarioPayload, ActualizarUsuarioPayload } from './models/usuario-central.interface';

// Servicios de otros módulos (Feature-based)
import { GrupoService } from '../../academico/grupos/services/grupo.service';
import { AsignacionStaffService } from '../../academico/grupos/services/asignacion-staff.service';
import { TipoStaff } from '../../academico/grupos/models/asignacion-staff.interface';
import { HistorialClinicoService } from '../../salud/kinesiologia/historial-clinico/services/historial-clinico.service';

// Enums Compartidos
import { Rol } from '../../../../shared/enums/rol.enum';
import { Posicion } from '../../../../shared/enums/posicion.enum';
import { Genero } from '../../../../shared/enums/genero.enum';
import { calcularEdad } from '../../../../shared/utils/fechas.util';

@Component({
  selector: 'app-usuarios',
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
export class UsuariosComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  private usuarioService = inject(UsuarioCentralService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private asignacionStaffService = inject(AsignacionStaffService);
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

  async ngOnInit() {
    this.configurarFiltrosPersonalizados();
    await Promise.all([
      this.cargarMaestros(),
      this.cargarDatos()
    ]);
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (!filter || filter.length === 0) return true;
      if (!value) return false;
      return value.some((p: string) => filter.includes(p));
    });
  }

  async cargarMaestros() {
    try {
      this.listaGrupos = await this.grupoService.listarGrupos() || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Aviso', detail: 'No se pudieron cargar los grupos' });
    }
  }

  async cambiarVista() { 
    this.limpiarFiltros();
    await this.cargarDatos(); 
  }

  esVistaStaff(): boolean {
    return this.vistaActual === Rol.PROFESOR || 
           this.vistaActual === Rol.KINESIOLOGO || 
           this.vistaActual === Rol.NUTRICIONISTA;
  }

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

  async cargarDatos() {
    this.loading = true;
    this.dataList = [];
    this.cdr.detectChanges();

    try {
      // Llamada nativa a la promesa
      const res = await this.usuarioService.listarUsuarios({ rol: this.vistaActual, limite: 200 });
      
      this.dataList = res.registros.map(user => {
        // 🔥 Solo necesitamos grupos_asignados porque el servicio ya hizo el trabajo sucio
        const gruposRelacion = user.grupos_asignados || [];
        
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
          gruposIds: idsGrupos
        };
      });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de usuarios' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async descargarExcel() {
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando directorio completo...' });
    try {
      await this.excelService.exportarUsuarios({});
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'No se pudo generar el Excel' });
    }
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
      genero: null, grupo_id: null, tipo_profesor: '', posicionesIds: [], direccion: '', prevision: '', peso: null, altura: null,
      gruposIds: [], gruposIdsOriginales: []
    };
  }

  async guardar() {
    if (this.guardando) return;
    if (this.isEditing && this.userForm.rut === '1-1') return;

    if (!this.userForm.nombre || !this.userForm.apellido || !this.userForm.email || !this.userForm.rut || !this.userForm.genero) {
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
    this.cdr.detectChanges();

    const payload: any = {
      rut: rutLimpio,
      nombre: this.userForm.nombre,
      apellido: this.userForm.apellido,
      email: this.userForm.email.toLowerCase(),
      genero: this.userForm.genero,
    };

    if (!this.isEditing) payload.rol = this.vistaActual;
    if (this.userForm.fecha_nacimiento) payload.fechaNacimiento = this.formatearFecha(this.userForm.fecha_nacimiento);

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

    try {
      let userId: string;
      let mensajeExito: string;

      if (this.isEditing) {
        // Llamada nativa a la promesa
        await this.usuarioService.actualizarUsuario(this.userForm.id, payload as ActualizarUsuarioPayload);
        userId = this.userForm.id;
        mensajeExito = 'Usuario actualizado con éxito';
      } else {
        payload.passwordTemporal = rutLimpio.replace(/-/g, '');
        // Llamada nativa a la promesa
        const res: any = await this.usuarioService.crearUsuario(payload as CrearUsuarioPayload);
        userId = res.id_usuario || res.id;
        mensajeExito = 'Usuario creado con éxito';
      }

      const msgGrupos = await this.procesarGruposAsignados(userId);
      const msgFoto = await this.procesarFotoPerfil(userId);

      this.finalizarGuardado(`${mensajeExito}${msgGrupos}${msgFoto}`);
    } catch (err: any) {
      this.mostrarErrorGuardado(err);
    }
  }

  private async procesarGruposAsignados(userId: string): Promise<string> {
    const tipoStaff = this.getTipoStaff();
    if (!tipoStaff) return '';

    const originales = this.userForm.gruposIdsOriginales || [];
    const nuevos = this.userForm.gruposIds || [];
    
    const gruposParaAgregar = nuevos.filter((id: number) => !originales.includes(id));
    const gruposParaQuitar = originales.filter((id: number) => !nuevos.includes(id));

    const peticiones: Promise<any>[] = [];

    gruposParaAgregar.forEach((grupoId: number) => {
      peticiones.push(this.asignacionStaffService.asignarStaff(grupoId, tipoStaff, { usuarioId: userId }));
    });

    gruposParaQuitar.forEach((grupoId: number) => {
      peticiones.push(this.asignacionStaffService.desasignarStaff(grupoId, tipoStaff, userId));
    });

    if (peticiones.length > 0) {
      try {
        await Promise.all(peticiones);
        return '';
      } catch (error) {
        return ' (Pero hubo un problema asignando los grupos)';
      }
    }
    return '';
  }

  private async procesarFotoPerfil(userId: string): Promise<string> {
    try {
      if (this.archivoSeleccionado) {
        this.uploadingFoto = true;
        this.cdr.detectChanges();
        await this.usuarioService.actualizarFoto(userId, this.archivoSeleccionado);
      } else if (this.isEditing && !this.previewUrl) {
        await this.usuarioService.eliminarFoto(userId);
      }
      return '';
    } catch (error) {
      return ' (Pero hubo un problema con la foto de perfil)';
    } finally {
      this.uploadingFoto = false;
    }
  }

  private finalizarGuardado(mensaje: string) {
    this.guardando = false;
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    this.cargarDatos();
  }

  private mostrarErrorGuardado(err: any) {
    this.guardando = false;
    let errorDetalle = 'Error al procesar la solicitud';
    if (err?.message) {
      errorDetalle = err.message;
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
      accept: async () => {
        try {
          if (usuario.activo) {
            await this.usuarioService.desactivarUsuario(usuario.id_usuario);
          } else {
            await this.usuarioService.reactivarUsuario(usuario.id_usuario);
          }
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado.' });
          await this.cargarDatos();
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado.' });
        }
      }
    });
  }

  eliminar(usuario: any) {
    if (usuario.rut === '1-1') return;
    this.confirmationService.confirm({
      message: `¿Eliminar permanentemente a ${usuario.nombre}? Esta acción borra todo su historial.`,
      header: 'Eliminar Usuario', icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar', acceptButtonStyleClass: 'p-button-danger', rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.usuarioService.eliminarUsuario(usuario.id_usuario);
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario borrado del sistema.' });
          await this.cargarDatos();
        } catch (err: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.message || 'No se puede eliminar.' });
        }
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
    return calcularEdad(fecha);
  }

  async abrirFicha(estudiante: any) {
    this.selectedEstudianteFicha = estudiante;
    this.displayFicha = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.cdr.detectChanges();

    try {
      this.historialClinico = await this.historialClinicoService.listarHistorialPorEstudiante(estudiante.id_usuario) || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial médico.' });
    } finally {
      this.loadingHistorial = false;
      this.cdr.detectChanges();
    }
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