import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

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

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-student-kine-evolution',
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
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './student-kine-evolution.html',
  styleUrls: ['./student-kine-evolution.css'] // Usa el mismo CSS
})
export class StudentKineEvolutionComponent implements OnInit {

  usuarioActualId: string | null = null;
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;

  // ==========================================
  // CONTROL DEL SWITCHER (Antecedentes / Evaluación)
  // ==========================================
  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];

  // ==========================================
  // MODELO DE LA FICHA MÉDICA
  // ==========================================
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: any[] = this.obtenerArticulacionesVacias();
  listaFuerzas: any[] = [];

  constructor(
    private messageService: MessageService,
    private healthService: HealthService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef 
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    if (this.usuarioActualId) {
      this.cargarHistorialFichas();
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
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar tu sesión.' });
    }
  }

  // ==========================================
  // MÉTODOS DE BASE DE DATOS
  // ==========================================
  async cargarHistorialFichas() {
    if (!this.usuarioActualId) return;

    this.cargandoHistorial = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.healthService.getFichasPorEstudiante(this.usuarioActualId);
      if (error) throw error;
      this.historialFichas = data || [];
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial clínico.' });
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges(); 
    }
  }

  // ==========================================
  // NAVEGACIÓN Y FLUJOS
  // ==========================================
  volverAlHistorial() {
    this.modoFormulario = false;
    this.resetearFormulario();
    this.cdr.detectChanges(); 
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
    this.cdr.detectChanges(); 
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