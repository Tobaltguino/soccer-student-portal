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

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-kine-evolution-record',
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
  templateUrl: './kine-evolution-record.html',
  styleUrls: ['./kine-evolution-record.css']
})
export class KineEvolutionRecordComponent implements OnInit {

  // ==========================================
  // ESTADOS DE LA VISTA E HISTORIAL
  // ==========================================
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  usuarioActualId: string | null = null;
  
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];

  modoFormulario: boolean = false;
  editandoId: string | null = null;
  modoSoloLectura: boolean = false; // <-- Control del modo Ver

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
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual(); // Primero sabemos quién está logueado
    this.cargarAlumnos();              // Luego cargamos sus alumnos
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
    }
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
    
    // 1. Cargamos datos básicos
    this.ficha = { ...fichaData };

    // 2. Reconstruimos el Rango de Movimiento (ROM)
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

    // 3. Reconstruimos Fuerza
    this.listaFuerzas = fichaData.fuerza_movimientos ? [...fichaData.fuerza_movimientos] : [];

    // 4. Mostramos el formulario habilitado
    this.modoFormulario = true;
    this.modoSoloLectura = false;
  }

  abrirVerFicha(fichaData: any) {
    this.abrirEditarFicha(fichaData); // Carga los datos igual que editar
    this.modoSoloLectura = true;      // Pero bloquea el formulario
  }

  // ==========================================
  // MÉTODOS DE BASE DE DATOS (Supabase)
  // ==========================================

  async cargarAlumnos() {
    try {
      // 1. Preparamos la consulta base
      let query = this.healthService['supabase']
        .from('estudiantes')
        .select('id, nombre, apellido, rut, grupo_id');

      // 2. Si hay un usuario logueado, buscamos si tiene grupos asignados como Kine
      if (this.usuarioActualId) {
        const { data: kineGrupos } = await this.healthService.getGruposDeKine(this.usuarioActualId);
        
        // Si encontramos grupos para este usuario, filtramos los estudiantes
        if (kineGrupos && kineGrupos.length > 0) {
          const grupoIds = kineGrupos.map((g: any) => g.grupo_id);
          query = query.in('grupo_id', grupoIds);
        }
      }

      // 3. Ejecutamos la consulta final
      const { data, error }: any = await query;

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

  async cargarHistorial() {
    this.cargandoHistorial = true;
    try {
      const { data, error } = await this.healthService.getFichasPorEstudiante(this.alumnoSeleccionado.id);
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
      const romObject: any = {};
      this.listaArticulaciones.forEach(art => {
        const clave = art.nombre.toLowerCase().replace('ñ', 'n'); 
        romObject[clave] = {
          der_activo: art.der_activo,
          der_pasivo: art.der_pasivo,
          izq_activo: art.izq_activo,
          izq_pasivo: art.izq_pasivo
        };
      });

      const payload = {
        ...this.ficha,
        estudiante_id: this.alumnoSeleccionado.id,
        kinesiologo_id: this.usuarioActualId, 
        rango_movimiento: romObject,
        fuerza_movimientos: this.listaFuerzas,
        balance_romberg: this.ficha.balance_romberg === '' ? null : this.ficha.balance_romberg
      };

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
      this.cargarHistorial();

    } catch (error) {
      console.error('Error al guardar ficha:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' });
    }
  }

  // ==========================================
  // UTILIDADES DEL FORMULARIO
  // ==========================================

  agregarFuerza() {
    this.listaFuerzas.push({ movimiento: '', escala: '' });
  }

  eliminarFuerza(index: number) {
    this.listaFuerzas.splice(index, 1);
  }

  resetearFormulario() {
    this.ficha = this.obtenerFichaVacia();
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    this.listaFuerzas = [];
  }

  obtenerFichaVacia() {
    return {
      rom_no_evaluable: false,
      fuerza_no_evaluable: false,
      balance_no_evaluable: false,
      inspeccion_mov_sin_compensacion: false,
      inspeccion_mov_con_compensacion: false,
      inspeccion_no_logra_mov: false,
      coord_dedo_nariz: false,
      coord_pinza_pulgar_indice: false,
      coord_talon_rodilla: false,
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