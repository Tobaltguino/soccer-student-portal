import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
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

import { FichaEvolutivaService } from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/services/ficha-evolutiva.service';
import { FichaEvolutiva, 
  ArticulacionRom,
  FuerzaMovimiento
} from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/models/ficha-evolutiva.interface';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { Rol } from '../../../../core/domains/usuarios/central/models/usuario.interface';

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
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ficha-evolutiva.component.html',
  styleUrls: ['./ficha-evolutiva.component.scss']
})
export class AdminKineEvolutionComponent implements OnInit {

  private fichaService = inject(FichaEvolutivaService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  listaKinesiologos: any[] = []; 
  
  cargandoHistorial: boolean = false;
  guardando: boolean = false;
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
  listaArticulaciones: ArticulacionRom[] = this.obtenerArticulacionesVacias();
  listaFuerzas: FuerzaMovimiento[] = [];

  ngOnInit() {
    this.cargarDatosGenerales();
  }

  cargarDatosGenerales() {
    this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }).subscribe({
      next: (resAlumnos) => {
        const alumnosBD = resAlumnos.registros || [];
        this.listaAlumnos = alumnosBD.map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;
          return { id: idUsuario, nombreCompleto: `${nombre} ${apellido} ${rut ? '('+rut+')' : ''}` };
        });
        this.cdr.detectChanges();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los estudiantes' })
    });

    this.usuarioService.listarUsuarios({ rol: Rol.KINESIOLOGO, limite: 200 }).subscribe({
      next: (resKines) => {
        this.listaKinesiologos = (resKines.registros || []).map((k: any) => ({
          id: k.id_usuario,
          nombreCompleto: `${k.nombre} ${k.apellido}`
        }));
        this.cdr.detectChanges();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los kinesiólogos' })
    });
  }

  onAlumnoChange() {
    this.volverAlHistorial();
    if (this.alumnoSeleccionado) {
      this.cargarHistorial();
    } else {
      this.historialFichas = [];
      this.cdr.detectChanges();
    }
  }

  cargarHistorial() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    this.fichaService.listarFichasPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        this.historialFichas = data || [];
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

  abrirNuevaFicha() {
    this.resetearFormulario();
    this.editandoId = null;
    this.vistaFormulario = 'antecedentes'; 
    this.modoFormulario = true;
    this.modoSoloLectura = false;
    this.cdr.detectChanges();
  }

  volverAlHistorial() {
    this.modoFormulario = false;
    this.editandoId = null;
    this.modoSoloLectura = false;
    this.resetearFormulario();
    this.cdr.detectChanges();
  }

  abrirEditarFicha(fichaData: any) {
    this.editandoId = fichaData.id;
    this.vistaFormulario = 'antecedentes';
    
    this.ficha = {
      kinesiologoId: fichaData.kinesiologo_id, 
      fechaEvaluacion: new Date(fichaData.fecha_evaluacion + 'T00:00:00'),
      diagnosticoMedico: fichaData.diagnostico_medico,
      observacion: fichaData.observacion,
      balanceRomberg: fichaData.balance_romberg,
      marcha: fichaData.marcha || '',
      antecedentesPersonales: fichaData.antecedentes_personales || {},
      antecedentesRemotos: fichaData.antecedentes_remotos || {},
      inspeccionEstatica: fichaData.inspeccion_estatica || {},
      inspeccionDinamica: fichaData.inspeccion_dinamica || { sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: fichaData.postura || {},
      sensibilidad: fichaData.sensibilidad || {},
      coordinacion: fichaData.coordinacion || { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false }
    };

    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    if (fichaData.rango_movimiento && fichaData.rango_movimiento.length > 0) {
      this.listaArticulaciones.forEach(art => {
        const guardado = fichaData.rango_movimiento.find((r: any) => r.nombre === art.nombre);
        if (guardado) {
          art.derActivo = guardado.derActivo;
          art.derPasivo = guardado.derPasivo;
          art.izqActivo = guardado.izqActivo;
          art.izqPasivo = guardado.izqPasivo;
        }
      });
    }

    this.listaFuerzas = fichaData.fuerza_movimientos ? [...fichaData.fuerza_movimientos] : [];
    
    this.modoFormulario = true;
    this.modoSoloLectura = false;
    this.cdr.detectChanges();
  }

  abrirVerFicha(fichaData: any) {
    this.abrirEditarFicha(fichaData); 
    this.modoSoloLectura = true;
    this.cdr.detectChanges();
  }

  guardarFicha() {
    if (this.guardando) return;

    if (!this.ficha.kinesiologoId) {
      this.messageService.add({ severity: 'warn', summary: 'Falta Kinesiólogo', detail: 'Debe asignar a un Profesional Tratante a la ficha.' });
      return;
    }

    if (!this.ficha.fechaEvaluacion) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Debe seleccionar una fecha para la evaluación.' });
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    let fechaFormateada = this.ficha.fechaEvaluacion;
    if (this.ficha.fechaEvaluacion instanceof Date) {
      const d = this.ficha.fechaEvaluacion;
      const tzOffset = d.getTimezoneOffset() * 60000;
      fechaFormateada = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
    }

    const payload: any = { 
      estudianteId: this.alumnoSeleccionado.id,
      kinesiologoId: this.ficha.kinesiologoId,
      fechaEvaluacion: fechaFormateada,
      diagnosticoMedico: this.ficha.diagnosticoMedico,
      observacion: this.ficha.observacion,
      balanceRomberg: this.ficha.balanceRomberg,
      marcha: this.ficha.marcha,
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
        this.guardando = false;
        this.volverAlHistorial();
        this.cargarHistorial();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al guardar la ficha.' });
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  agregarFuerza() { this.listaFuerzas.push({ movimiento: '', escala: '' }); }
  eliminarFuerza(index: number) { this.listaFuerzas.splice(index, 1); }

  resetearFormulario() {
    this.ficha = this.obtenerFichaVacia();
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    this.listaFuerzas = [];
  }

  obtenerFichaVacia() {
    return {
      kinesiologoId: null,
      fechaEvaluacion: new Date(),
      diagnosticoMedico: '',
      observacion: '',
      balanceRomberg: null,
      marcha: '',
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