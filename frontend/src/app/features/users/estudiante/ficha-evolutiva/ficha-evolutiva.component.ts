import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';

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
import { DatePickerModule } from 'primeng/datepicker'; 
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService

// Nuevos Servicios y Modelos
import { FichaEvolutivaService } from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/services/ficha-evolutiva.service';
import { FichaEvolutiva, 
  CrearFichaPayload,
  ArticulacionRom,
  FuerzaMovimiento
} from '../../../../core/domains/salud/kinesiologia/ficha-evolutiva/models/ficha-evolutiva.interface';

import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';

@Component({
  selector: 'app-estudiante-ficha-evolutiva',
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
    DatePickerModule,
    ProgressSpinnerModule,
    ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './ficha-evolutiva.component.html',
  styleUrls: ['./ficha-evolutiva.component.scss'] // 🔥 Cambiado a .scss
})
export class EstudianteFichaEvolutivaComponent implements OnInit {

  private fichaService = inject(FichaEvolutivaService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  cargandoHistorial: boolean = false;
  historialFichas: any[] = [];
  listaKinesiologos: any[] = [];
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
    this.cargarMisDatos();
  }

  cargarMisDatos() {
    this.cargandoHistorial = true;

    const kinesiologosReq: Observable<any[]> = (this.usuarioService as any).listarKinesiologos 
      ? (this.usuarioService as any).listarKinesiologos() 
      : of([]);

    forkJoin({
      kines: kinesiologosReq,
      fichas: this.fichaService.listarMisFichas()
    }).subscribe({
      next: (res) => {
        this.listaKinesiologos = (res.kines || []).map((k: any) => ({
          id: k.id,
          nombreCompleto: `${k.nombre} ${k.apellido}`
        }));

        this.historialFichas = (res.fichas || []).map(f => ({
          ...f,
          kinesiologoObj: this.listaKinesiologos.find(k => k.id === f.kinesiologo_id) || { nombreCompleto: 'Desconocido' }
        }));

        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial clínico.' });
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirVerFicha(fichaData: FichaEvolutiva) {
    this.vistaFormulario = 'antecedentes';
    
    this.ficha = {
      fechaEvaluacion: new Date(fichaData.fecha_evaluacion + 'T00:00:00'),
      kinesiologoObj: this.listaKinesiologos.find(k => k.id === fichaData.kinesiologo_id) || { nombreCompleto: 'Desconocido' },
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
        const guardado = fichaData.rango_movimiento!.find(r => r.nombre === art.nombre);
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
  }

  resetearFormulario() {
    this.ficha = this.obtenerFichaVacia();
    this.listaArticulaciones = this.obtenerArticulacionesVacias();
    this.listaFuerzas = [];
  }

  obtenerFichaVacia() {
    return {
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