import { Component, OnInit } from '@angular/core';
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

import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';

@Component({
  selector: 'app-admin-kine-evolution',
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
  templateUrl: './admin-kine-evolution.html',
  styleUrls: ['./admin-kine-evolution.css']
})
export class AdminKineEvolutionComponent implements OnInit {

  // ==========================================
  // ESTADOS DE LA VISTA E HISTORIAL
  // ==========================================
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  listaKinesiologos: any[] = []; 
  
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];

  modoFormulario: boolean = false;
  editandoId: string | null = null;
  modoSoloLectura: boolean = false;

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
    private kinesiologiaService: KinesiologiaService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    this.cargarAlumnos();
    this.cargarKinesiologos(); 
  }

  // ==========================================
  // NAVEGACIÓN Y FLUJOS
  // ==========================================

  onAlumnoChange() {
    this.volverAlHistorial();
    if (this.alumnoSeleccionado) {
      this.cargarHistorial();
    } else {
      this.historialFichas = [];
    }
  }

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

  // ==========================================
  // MÉTODOS DE BASE DE DATOS (Supabase)
  // ==========================================

  async cargarAlumnos() {
    try {
      const { data, error } = await this.usuariosService.getAlumnosBasicoConRut();

      if (error) throw error;

      if (data) {
        this.listaAlumnos = data.map((a: any) => ({
          ...a,
          nombreCompleto: `${a.nombre} ${a.apellido} ${a.rut ? '('+a.rut+')' : ''}`
        }));
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los alumnos' });
    }
  }

  async cargarKinesiologos() {
    try {
      const { data, error }: any = await this.kinesiologiaService.getKinesiologos();
      
      if (error) throw error;
      if (data) {
        this.listaKinesiologos = data.map((k: any) => ({
            id: k.id,
            nombreCompleto: `${k.nombre} ${k.apellido}`
        }));
      }
    } catch (error) {
      console.error(error);
    }
  }

  async cargarHistorial() {
    this.cargandoHistorial = true;
    try {
      const { data, error } = await this.kinesiologiaService.getFichasPorEstudiante(this.alumnoSeleccionado.id);
      if (error) throw error;
      
      this.historialFichas = data || [];
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
    } finally {
      this.cargandoHistorial = false;
    }
  }

  async guardarFicha() {
    try {
      if (!this.ficha.kinesiologo_id) {
        this.messageService.add({ severity: 'warn', summary: 'Falta Kinesiólogo', detail: 'Debe asignar a un Profesional Tratante a la ficha.' });
        return;
      }

      const romObject: any = {};
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n'); 
        romObject[clave] = {
          der_activo: art.der_activo, der_pasivo: art.der_pasivo,
          izq_activo: art.izq_activo, izq_pasivo: art.izq_pasivo
        };
      });

      const payload = {
        ...this.ficha,
        estudiante_id: this.alumnoSeleccionado.id,
        kinesiologo_id: this.ficha.kinesiologo_id, 
        rango_movimiento: romObject,
        fuerza_movimientos: this.listaFuerzas,
        balance_romberg: this.ficha.balance_romberg === '' ? null : this.ficha.balance_romberg
      };

      delete payload.kinesiologos;

      if (this.editandoId) {
        const { error } = await this.kinesiologiaService.updateFichaEvolutiva(this.editandoId, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Ficha actualizada correctamente.' });
      } else {
        // 🚀 CAMBIO 7: Usamos kinesiologiaService
        const { error } = await this.kinesiologiaService.crearFichaEvolutiva(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nueva ficha registrada.' });
      }
      
      this.volverAlHistorial();
      this.cargarHistorial();

    } catch (error) {
      console.error('Error al guardar ficha:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' });
    }
  }

  // ==========================================
  // UTILIDADES DEL FORMULARIO
  // ==========================================

  agregarFuerza() { this.listaFuerzas.push({ movimiento: '', escala: '' }); }
  eliminarFuerza(index: number) { this.listaFuerzas.splice(index, 1); }

  resetearFormulario() {
    this.ficha = this.obtenerFichaVacia();
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    this.listaFuerzas = [];
  }

  obtenerFichaVacia() {
    return {
      kinesiologo_id: null,
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