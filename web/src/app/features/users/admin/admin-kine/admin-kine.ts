import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Módulos de PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
import { DialogModule } from 'primeng/dialog'; // 🔥 NUEVO MÓDULO
import { DatePickerModule } from 'primeng/datepicker';

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-kine',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    InputNumberModule,
    TableModule,
    SelectModule,
    SelectButtonModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule // 🔥 Añadido aquí
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './admin-kine.html',
  styleUrls: ['./admin-kine.css']
})
export class AdminKineComponent implements OnInit {

  seccionActiva: string = 'ficha';
  opcionesMenuAdmin: any[] = [
    { label: 'Ficha Evolutiva', value: 'ficha', icon: 'pi pi-file-edit' },
    { label: 'Lesiones y Ant.', value: 'lesiones', icon: 'pi pi-heart-fill' },
    { label: 'Evaluaciones Físicas', value: 'evaluaciones', icon: 'pi pi-chart-line' }
  ];

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  usuarioActualId: string | null = null;
  listaKinesiologos: any[] = []; 
  
  // ESTADOS FICHA EVOLUTIVA
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;
  editandoId: string | null = null;
  modoSoloLectura: boolean = false;

  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: any[] = this.obtenerArticulacionesVacias();
  listaFuerzas: any[] = [];

  // 🔥 NUEVOS ESTADOS PARA LESIONES Y ANTECEDENTES
  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;
  mostrarDialogoLesion: boolean = false;
  lesionActual: any = {};
  // Opciones exactas que acepta la Base de Datos
  opcionesTipoLesion: any[] = [
    { label: 'Lesión', value: 'LESION' },
    { label: 'Patología', value: 'PATOLOGIA' },
    { label: 'Alergia', value: 'ALERGIA' }
  ];
  opcionesEstadoLesion: any[] = [
    { label: 'Activo', value: 'ACTIVO' },
    { label: 'En Tratamiento', value: 'EN_TRATAMIENTO' }, // <-- Aquí está el guión bajo
    { label: 'Recuperado', value: 'RECUPERADO' }
  ];

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService, 
    private healthService: HealthService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    this.cargarAlumnos();
    this.cargarKinesiologos();
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) this.usuarioActualId = user.id; 
    } catch (error) { console.error(error); }
  }

  async cargarAlumnos() {
    try {
      const { data, error }: any = await this.healthService['supabase'].from('estudiantes').select('id, nombre, apellido, rut, grupo_id');
      if (error) throw error;
      if (data) {
        this.listaAlumnos = data.map((a: any) => ({
          ...a, nombreCompleto: `${a.nombre} ${a.apellido} ${a.rut ? '('+a.rut+')' : ''}`
        }));
      }
    } catch (error) { console.error(error); }
  }

  async cargarKinesiologos() {
    try {
      const { data, error }: any = await this.healthService['supabase'].from('kinesiologos').select('id, nombre, apellido').order('nombre', { ascending: true });
      if (error) throw error;
      if (data) {
        this.listaKinesiologos = data.map((k: any) => ({ id: k.id, nombreCompleto: `${k.nombre} ${k.apellido}` }));
      }
    } catch (error) { console.error(error); }
  }

  // ==========================================
  // DISPARADOR PRINCIPAL AL CAMBIAR DE ALUMNO
  // ==========================================
  onAlumnoChange() {
    this.volverAlHistorial(); // Resetea formularios de Ficha
    if (this.alumnoSeleccionado) {
      this.cargarHistorialFichas();
      this.cargarListaLesiones(); // 🔥 Cargamos también las lesiones
    } else {
      this.historialFichas = [];
      this.listaLesiones = [];
    }
  }

  // =========================================================================
  // MÓDULO: LESIONES Y ANTECEDENTES (HISTORIAL CLÍNICO)
  // =========================================================================

  async cargarListaLesiones() {
    this.cargandoLesiones = true;
    try {
      const { data, error } = await this.healthService.getHistorialClinico(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de lesiones.' });
    } finally {
      this.cargandoLesiones = false;
    }
  }

  abrirNuevaLesion() {
    this.lesionActual = { 
      tipo: 'LESION', 
      estado: 'ACTIVO', // <-- En mayúsculas
      fecha_evento: new Date() 
    };
    this.mostrarDialogoLesion = true;
  }

  abrirEditarLesion(lesion: any) {
    this.lesionActual = { ...lesion };
    
    // 🔥 Convertimos el string YYYY-MM-DD a un Date de JavaScript evitando bugs de zona horaria
    if (this.lesionActual.fecha_evento) {
      const partes = this.lesionActual.fecha_evento.split('-');
      this.lesionActual.fecha_evento = new Date(partes[0], partes[1] - 1, partes[2]);
    }
    
    this.mostrarDialogoLesion = true;
  }

  async guardarLesion() {
    try {
      // 🔥 CAMBIO: Validamos 'diagnostico' en lugar de 'descripcion'
      if (!this.lesionActual.tipo || !this.lesionActual.diagnostico || !this.lesionActual.fecha_evento) {
        this.messageService.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Debe completar la fecha, tipo y diagnóstico.' });
        return;
      }

      let fechaFormateada = this.lesionActual.fecha_evento;
      if (this.lesionActual.fecha_evento instanceof Date) {
        const d = this.lesionActual.fecha_evento;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaFormateada = `${year}-${month}-${day}`;
      }

      const payload = {
        ...this.lesionActual,
        estudiante_id: this.alumnoSeleccionado.id,
        fecha_evento: fechaFormateada
      };

      if (payload.id) {
        const { error } = await this.healthService.updateHistorialClinico(payload.id, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado.' });
      } else {
        const { error } = await this.healthService.crearHistorialClinico(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nuevo registro añadido.' });
      }

      this.mostrarDialogoLesion = false;
      this.cargarListaLesiones();

    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar.' });
    }
  }

  confirmarEliminarLesion(lesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar este registro de ${lesion.tipo}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          const { error } = await this.healthService.eliminarHistorialClinico(lesion.id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado exitosamente.' });
          this.cargarListaLesiones(); 
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro.' });
        }
      }
    });
  }

  // =========================================================================
  // MÓDULO: FICHA EVOLUTIVA KINÉSICA
  // =========================================================================

  abrirNuevaFicha() {
    this.resetearFormulario();
    this.editandoId = null;
    this.vistaFormulario = 'antecedentes'; 
    this.modoFormulario = true;
    this.modoSoloLectura = false;
  }

  volverAlHistorial() {
    this.modoFormulario = false;
    this.editandoId = null;
    this.modoSoloLectura = false;
    this.resetearFormulario();
  }

  abrirEditarFicha(fichaData: any) {
    this.editandoId = fichaData.id;
    this.vistaFormulario = 'antecedentes';
    this.ficha = { ...fichaData };

    if (fichaData.rango_movimiento) {
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n');
        const romGuardado = fichaData.rango_movimiento[clave];
        if (romGuardado) {
          art.der_activo = romGuardado.der_activo;
          art.der_pasivo = romGuardado.der_pasivo;
          art.izq_activo = romGuardado.izq_activo;
          art.izq_pasivo = romGuardado.izq_pasivo;
        }
      });
    }

    this.listaFuerzas = fichaData.fuerza_movimientos ? [...fichaData.fuerza_movimientos] : [];
    this.modoFormulario = true;
    this.modoSoloLectura = false;
  }

  abrirVerFicha(fichaData: any) {
    this.abrirEditarFicha(fichaData); 
    this.modoSoloLectura = true;      
  }

  async cargarHistorialFichas() {
    this.cargandoHistorial = true;
    try {
      const { data, error } = await this.healthService.getFichasPorEstudiante(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.historialFichas = data || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
    } finally {
      this.cargandoHistorial = false;
    }
  }

  async guardarFicha() {
    try {
      if (!this.ficha.kinesiologo_id) {
        this.messageService.add({ severity: 'warn', summary: 'Falta Kinesiólogo', detail: 'Debe asignar a un Profesional Tratante.' });
        return;
      }
      const romObject: any = {};
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n'); 
        romObject[clave] = {
          der_activo: art.der_activo, der_pasivo: art.der_pasivo, izq_activo: art.izq_activo, izq_pasivo: art.izq_pasivo
        };
      });

      const payload: any = {
        ...this.ficha,
        estudiante_id: this.alumnoSeleccionado.id,
        rango_movimiento: romObject,
        fuerza_movimientos: this.listaFuerzas,
        balance_romberg: this.ficha.balance_romberg === '' ? null : this.ficha.balance_romberg
      };

      if (!this.editandoId) payload.kinesiologo_id = this.usuarioActualId;
      delete payload.kinesiologos; 

      if (this.editandoId) {
        const { error } = await this.healthService.updateFichaEvolutiva(this.editandoId, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Ficha actualizada correctamente.' });
      } else {
        const { error } = await this.healthService.crearFichaEvolutiva(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nueva ficha registrada.' });
      }
      
      this.volverAlHistorial();
      this.cargarHistorialFichas();

    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' });
    }
  }

  confirmarEliminacion(ficha: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar permanentemente la ficha del ${new Date(ficha.fecha_creacion).toLocaleDateString('es-CL')}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          const { error } = await this.healthService.eliminarFichaEvolutiva(ficha.id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'La ficha fue eliminada exitosamente.' });
          this.cargarHistorialFichas(); 
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la ficha.' });
        }
      }
    });
  }

  agregarFuerza() { this.listaFuerzas.push({ movimiento: '', escala: '' }); }
  eliminarFuerza(index: number) { this.listaFuerzas.splice(index, 1); }
  resetearFormulario() { this.ficha = this.obtenerFichaVacia(); this.listaArticulaciones = this.obtenerArticulacionesVacias(); this.listaFuerzas = []; }

  obtenerFichaVacia() {
    return {
      kinesiologo_id: null, rom_no_evaluable: false, fuerza_no_evaluable: false, balance_no_evaluable: false,
      inspeccion_mov_sin_compensacion: false, inspeccion_mov_con_compensacion: false, inspeccion_no_logra_mov: false,
      coord_dedo_nariz: false, coord_pinza_pulgar_indice: false, coord_talon_rodilla: false, balance_romberg: null
    };
  }

  obtenerArticulacionesVacias() {
    return [
      { nombre: 'Hombro', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Codo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Muñeca', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Dedos', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Cadera', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Rodilla', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Tobillo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null },
      { nombre: 'Ortejo', der_activo: null, der_pasivo: null, izq_activo: null, izq_pasivo: null }
    ];
  }
}