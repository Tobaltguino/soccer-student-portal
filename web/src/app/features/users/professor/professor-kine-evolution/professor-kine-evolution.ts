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

import { AuthService } from '../../../../core/services/auth.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { GruposService } from '../../../../core/services/modulos/academico/grupos.service';

@Component({
  selector: 'app-professor-kine-evolution',
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
  templateUrl: './professor-kine-evolution.html',
  styleUrls: ['./professor-kine-evolution.css']
})
export class ProfessorKineEvolutionComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;

  // Switcher interno
  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];

  // Modelo de ficha (Lectura)
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: any[] = this.obtenerArticulacionesVacias();
  listaFuerzas: any[] = [];

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private usuariosService: UsuariosService,
    private gruposService: GruposService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    await this.cargarAlumnos();
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user && user.email) {
        const { data: prof } = await this.usuariosService.getProfesorByEmail(user.email);
        if(prof) {
            this.usuarioActualId = prof.id;
        }
      }
    } catch (error) { 
      console.error(error); 
    }
  }

  async cargarAlumnos() {
    try {
      if (!this.usuarioActualId) return;

      const { data: gruposProfe, error: errGrupos } = await this.gruposService.getGruposDeProfesor(this.usuarioActualId);
      if (errGrupos) throw errGrupos;

      if (gruposProfe && gruposProfe.length > 0) {
        const grupoIds = gruposProfe.map((g: any) => g.grupo_id);

        const { data, error } = await this.usuariosService.getTodosEstudiantesPorGrupos(grupoIds);

        if (error) throw error;
        
        this.listaAlumnos = (data || []).map((a: any) => ({
          ...a, nombreCompleto: `${a.nombre} ${a.apellido} ${a.rut ? '('+a.rut+')' : ''}`
        }));
      }
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los alumnos' });
    } finally {
      this.cdr.detectChanges();
    }
  }

  onAlumnoChange() {
    this.volverAlHistorial();
    if (this.alumnoSeleccionado) {
      this.cargarHistorialFichas();
    } else {
      this.historialFichas = [];
      this.cdr.detectChanges();
    }
  }

  async cargarHistorialFichas() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();
    try {
      const { data, error } = await this.kinesiologiaService.getFichasPorEstudiante(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.historialFichas = data || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar el historial' });
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
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

  volverAlHistorial() {
    this.modoFormulario = false;
    this.resetearFormulario();
    this.cdr.detectChanges();
  }

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