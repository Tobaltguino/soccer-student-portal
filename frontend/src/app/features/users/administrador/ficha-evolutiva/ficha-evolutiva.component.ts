import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
import { forkJoin, Observable, of } from 'rxjs';

// Nuevos Servicios y Modelos
import { FichaEvolutivaService } from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/services/ficha-evolutiva.service';
import { FichaEvolutiva, 
  CrearFichaPayload,
  ArticulacionRom,
  FuerzaMovimiento
} from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/models/ficha-evolutiva.interface';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
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
  templateUrl: './ficha-evolutiva.component.html',
  styleUrls: ['./ficha-evolutiva.component.css']
})
export class AdminKineEvolutionComponent implements OnInit {

  private fichaService = inject(FichaEvolutivaService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // ==========================================
  // ESTADOS DE LA VISTA E HISTORIAL
  // ==========================================
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  listaKinesiologos: any[] = []; 
  
  cargandoHistorial: boolean = false;
  historialFichas: any[] = []; // Fichas mapeadas con Kinesiólogo obj

  modoFormulario: boolean = false;
  editandoId: string | null = null;
  modoSoloLectura: boolean = false;

  // ==========================================
  // CONTROL DEL SWITCHER
  // ==========================================
  vistaFormulario: string = 'antecedentes';
  opcionesVistaForm: any[] = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];

  // ==========================================
  // MODELO ESTRICTO DE LA FICHA MÉDICA
  // ==========================================
  ficha: any = this.obtenerFichaVacia();
  opcionesROM: string[] = ['Normal', 'Bueno', 'Moderado', 'Limitado'];
  listaArticulaciones: ArticulacionRom[] = this.obtenerArticulacionesVacias();
  listaFuerzas: FuerzaMovimiento[] = [];

  ngOnInit() {
    this.cargarDatosGenerales();
  }

  // ==========================================
  // CARGA DE DATOS PRINCIPALES
  // ==========================================
  cargarDatosGenerales() {
    // 1. Cargamos alumnos y kinesiólogos en paralelo
    const kinesiologosReq: Observable<any[]> = (this.usuarioService as any).listarKinesiologos 
      ? (this.usuarioService as any).listarKinesiologos() 
      : of([]);

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }),
      kines: kinesiologosReq
    }).subscribe({
      next: (res) => {
        // Mapeo Alumnos
        const alumnosBD = res.alumnos.registros || [];
        this.listaAlumnos = alumnosBD.map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;
          return { id: idUsuario, nombreCompleto: `${nombre} ${apellido} ${rut ? '('+rut+')' : ''}` };
        });

        // Mapeo Kinesiólogos
        this.listaKinesiologos = (res.kines || []).map((k: any) => ({
            id: k.id,
            nombreCompleto: `${k.nombre} ${k.apellido}`
        }));
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos base' })
    });
  }

  onAlumnoChange() {
    this.volverAlHistorial();
    if (this.alumnoSeleccionado) {
      this.cargarHistorial();
    } else {
      this.historialFichas = [];
    }
  }

  cargarHistorial() {
    this.cargandoHistorial = true;
    this.fichaService.listarFichasPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        // Enlazamos el objeto del kinesiólogo a la ficha para la tabla
        this.historialFichas = (data || []).map(f => ({
          ...f,
          kinesiologoObj: this.listaKinesiologos.find(k => k.id === f.kinesiologo_id) || { nombreCompleto: 'Desconocido' }
        }));
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // NAVEGACIÓN Y FLUJOS
  // ==========================================
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

  abrirEditarFicha(fichaData: FichaEvolutiva) {
    this.editandoId = fichaData.id;
    this.vistaFormulario = 'antecedentes';
    
    // Mapeo estricto inverso (De Base de Datos a Formulario)
    this.ficha = {
      kinesiologoId: fichaData.kinesiologo_id, 
      fechaEvaluacion: new Date(fichaData.fecha_evaluacion + 'T00:00:00'),
      diagnosticoMedico: fichaData.diagnostico_medico,
      observacion: fichaData.observacion,
      balanceRomberg: fichaData.balance_romberg,
      // Inicializamos objetos por si vienen null desde la BD para no romper el ngModel
      antecedentesPersonales: fichaData.antecedentes_personales || {},
      antecedentesRemotos: fichaData.antecedentes_remotos || {},
      inspeccionEstatica: fichaData.inspeccion_estatica || {},
      inspeccionDinamica: fichaData.inspeccion_dinamica || { sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: fichaData.postura || {},
      sensibilidad: fichaData.sensibilidad || {},
      coordinacion: fichaData.coordinacion || { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false }
    };

    // Mapeo de ROM
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    if (fichaData.rango_movimiento && fichaData.rango_movimiento.length > 0) {
      this.listaArticulaciones.forEach(art => {
        const guardado = fichaData.rango_movimiento!.find(r => r.nombre === art.nombre);
        if (guardado) {
          art.derActivo = guardado.derActivo;
          art.derPasivo = guardado.derPasivo;
          art.izqActivo = guardado.izqActivo;
          art.izqPasivo = guardado.izqPasivo;
        }
      });
    }

    // Mapeo de Fuerza
    this.listaFuerzas = fichaData.fuerza_movimientos ? [...fichaData.fuerza_movimientos] : [];
    
    this.modoFormulario = true;
    this.modoSoloLectura = false;
  }

  abrirVerFicha(fichaData: FichaEvolutiva) {
    this.abrirEditarFicha(fichaData); 
    this.modoSoloLectura = true;      
  }

  // ==========================================
  // GUARDAR (Mapeo estricto UI -> Payload)
  // ==========================================
  guardarFicha() {
    if (!this.ficha.kinesiologoId) {
      this.messageService.add({ severity: 'warn', summary: 'Falta Kinesiólogo', detail: 'Debe asignar a un Profesional Tratante a la ficha.' });
      return;
    }

    let fechaFormateada = this.ficha.fechaEvaluacion;
    if (this.ficha.fechaEvaluacion instanceof Date) {
      fechaFormateada = this.ficha.fechaEvaluacion.toISOString().split('T')[0];
    }

    // Armamos el Payload adhiriendo 100% a las interfaces
    const payload: any = { // Hacemos un bypass de any momentáneo para inyectar kinesiologoId si el backend lo permite
      estudianteId: this.alumnoSeleccionado.id,
      kinesiologoId: this.ficha.kinesiologoId, // Se asume que el backend lo acepta para el rol Admin
      fechaEvaluacion: fechaFormateada,
      diagnosticoMedico: this.ficha.diagnosticoMedico,
      observacion: this.ficha.observacion,
      balanceRomberg: this.ficha.balanceRomberg,
      antecedentesPersonales: this.ficha.antecedentesPersonales,
      antecedentesRemotos: this.ficha.antecedentesRemotos,
      inspeccionEstatica: this.ficha.inspeccionEstatica,
      inspeccionDinamica: this.ficha.inspeccionDinamica,
      postura: this.ficha.postura,
      sensibilidad: this.ficha.sensibilidad,
      coordinacion: this.ficha.coordinacion,
      fuerzaMovimientos: this.listaFuerzas,
      rangoMovimiento: this.listaArticulaciones
    };

    const peticion$ = this.editandoId 
      ? this.fichaService.actualizarFicha(this.editandoId, payload)
      : this.fichaService.crearFicha(payload);

    peticion$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editandoId ? 'Ficha actualizada.' : 'Nueva ficha registrada.' });
        this.volverAlHistorial();
        this.cargarHistorial();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' })
    });
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

  // Inicializa todo vacío y estructurado para evitar que [(ngModel)] falle por null
  obtenerFichaVacia() {
    return {
      kinesiologoId: null,
      fechaEvaluacion: new Date(),
      diagnosticoMedico: '',
      observacion: '',
      balanceRomberg: null,
      antecedentesPersonales: {},
      antecedentesRemotos: {},
      inspeccionEstatica: {},
      inspeccionDinamica: { sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: {},
      sensibilidad: {},
      coordinacion: { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false }
    };
  }

  obtenerArticulacionesVacias(): ArticulacionRom[] {
    return [
      { nombre: 'Hombro', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Codo', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Muñeca', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Dedos', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Cadera', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Rodilla', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Tobillo', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined },
      { nombre: 'Ortejo', derActivo: undefined, derPasivo: undefined, izqActivo: undefined, izqPasivo: undefined }
    ];
  }
}