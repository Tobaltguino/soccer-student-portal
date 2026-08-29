import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

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
import { DatePickerModule } from 'primeng/datepicker'; 

import { FichaEvolutivaService } from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/services/ficha-evolutiva.service';
import { FichaEvolutiva, 
  ArticulacionRom,
  FuerzaMovimiento
} from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/models/ficha-evolutiva.interface';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-profesor-ficha-evolutiva',
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
    DatePickerModule 
  ],
  providers: [MessageService],
  templateUrl: './ficha-evolutiva.component.html',
  styleUrls: ['./ficha-evolutiva.component.scss']
})
export class ProfesorFichaEvolutivaComponent implements OnInit {

  private fichaService = inject(FichaEvolutivaService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;
  
  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  modoFormulario: boolean = false;

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
    this.cargarAlumnos();
  }

  cargarAlumnos() {
    this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }).subscribe({
      next: (res) => {
        const alumnosBD = res.registros || [];
        this.listaAlumnos = alumnosBD.map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;
          
          return { id: idUsuario, nombreCompleto: `${nombre} ${apellido} ${rut ? '('+rut+')' : ''}` };
        });
        this.cdr.detectChanges();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus pacientes.' })
    });
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

  cargarHistorialFichas() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    this.fichaService.listarFichasPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        this.historialFichas = data || [];
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar el historial.' });
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirVerFicha(fichaData: any) {
    this.vistaFormulario = 'antecedentes';
    
    this.ficha = {
      fechaEvaluacion: new Date(fichaData.fecha_evaluacion + 'T00:00:00'),
      kinesiologoNombre: fichaData.kinesiologo 
        ? `${fichaData.kinesiologo.nombre} ${fichaData.kinesiologo.apellido}` 
        : 'Desconocido',
      diagnosticoMedico: fichaData.diagnostico_medico,
      observacion: fichaData.observacion,
      balanceRomberg: fichaData.balance_romberg,
      antecedentesPersonales: fichaData.antecedentes_personales || {},
      antecedentesRemotos: fichaData.antecedentes_remotos || {},
      inspeccionEstatica: fichaData.inspeccion_estatica || {},
      inspeccionDinamica: fichaData.inspeccion_dinamica || { sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: fichaData.postura || {},
      sensibilidad: fichaData.sensibilidad || {},
      coordinacion: fichaData.coordinacion || { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false },
      marcha: fichaData.marcha || ''
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
      fechaEvaluacion: new Date(),
      kinesiologoNombre: '',
      diagnosticoMedico: '',
      observacion: '',
      balanceRomberg: null,
      antecedentesPersonales: {},
      antecedentesRemotos: {},
      inspeccionEstatica: {},
      inspeccionDinamica: { sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: {},
      sensibilidad: {},
      coordinacion: { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false },
      marcha: ''
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