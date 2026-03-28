import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

// Módulos de PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-student-kine',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    TableModule,
    SelectModule,
    SelectButtonModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './student-kine.html',
  styleUrls: ['./student-kine.css']
})
export class StudentKineComponent implements OnInit {

  // ==========================================
  // NAVEGACIÓN SUPERIOR (ESTUDIANTE)
  // ==========================================
  seccionActiva: string = 'ficha';
  opcionesMenuEstudiante: any[] = [
    { label: 'Mi Ficha Evolutiva', value: 'ficha', icon: 'pi pi-file-edit' },
    { label: 'Mis Lesiones y Ant.', value: 'lesiones', icon: 'pi pi-heart-fill' },
    { label: 'Mis Evaluaciones', value: 'evaluaciones', icon: 'pi pi-chart-line' }
  ];

  // ==========================================
  // ESTADOS DE LA VISTA E HISTORIAL
  // ==========================================
  usuarioActualId: string | null = null;
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;

  // 🔥 NUEVOS ESTADOS PARA LESIONES (SOLO LECTURA)
  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  // ==========================================
  // CONTROL DEL SWITCHER INTERNO
  // ==========================================
  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];

  // ==========================================
  // MODELO DE LA FICHA MÉDICA (SOLO LECTURA)
  // ==========================================
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: any[] = this.obtenerArticulacionesVacias();
  listaFuerzas: any[] = [];

  constructor(
    private messageService: MessageService,
    private healthService: HealthService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    // Apenas sabemos quién es, cargamos SU propio historial y sus lesiones
    if (this.usuarioActualId) {
      this.cargarHistorialFichas();
      this.cargarListaLesiones();
    }
  }

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) {
        this.usuarioActualId = user.id; 
      }
    } catch (error) {
      console.error("No se pudo obtener el usuario actual", error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar la sesión.' });
    }
  }

  // ==========================================
  // MÉTODOS DE BASE DE DATOS (HISTORIAL PROPIO)
  // ==========================================
  async cargarHistorialFichas() {
    if (!this.usuarioActualId) return;

    this.cargandoHistorial = true;
    try {
      const { data, error } = await this.healthService.getFichasPorEstudiante(this.usuarioActualId);
      if (error) throw error;
      this.historialFichas = data || [];
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial clínico.' });
    } finally {
      this.cargandoHistorial = false;
    }
  }

  async cargarListaLesiones() {
    if (!this.usuarioActualId) return;

    this.cargandoLesiones = true;
    try {
      const { data, error } = await this.healthService.getHistorialClinico(this.usuarioActualId);
      if (error) throw error;
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error al cargar lesiones:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus lesiones.' });
    } finally {
      this.cargandoLesiones = false;
    }
  }

  // ==========================================
  // NAVEGACIÓN Y FLUJOS
  // ==========================================
  volverAlHistorial() {
    this.modoFormulario = false;
    this.resetearFormulario();
  }

  abrirVerFicha(fichaData: any) {
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
  }

  // ==========================================
  // UTILIDADES DEL FORMULARIO
  // ==========================================
  resetearFormulario() {
    this.ficha = this.obtenerFichaVacia();
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    this.listaFuerzas = [];
  }

  obtenerFichaVacia() {
    return {
      rom_no_evaluable: false, fuerza_no_evaluable: false, balance_no_evaluable: false,
      inspeccion_mov_sin_compensacion: false, inspeccion_mov_con_compensacion: false, inspeccion_no_logra_mov: false,
      coord_dedo_nariz: false, coord_pinza_pulgar_indice: false, coord_talon_rodilla: false,
      balance_romberg: null
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