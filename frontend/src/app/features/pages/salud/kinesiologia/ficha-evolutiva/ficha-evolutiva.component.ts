import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService, ConfirmationService } from 'primeng/api';

// Core y Shared
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { Rol } from '../../../../../shared/enums/rol.enum';

// Servicios Locales (Feature-Based)
import { UsuarioCentralService } from '../../../administracion/usuarios/services/usuarios-central.service';
import { FichaEvolutivaService } from './services/ficha-evolutiva.service';

@Component({
  selector: 'app-ficha-evolutiva',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, DatePickerModule, TagModule, CheckboxModule,
    TooltipModule, SelectButtonModule, ToastModule, ConfirmDialogModule, InputNumberModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ficha-evolutiva.component.html',
  styleUrls: ['./ficha-evolutiva.component.scss']
})
export class FichaEvolutivaComponent implements OnInit {

  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioCentralService);
  private fichaEvolutivaService = inject(FichaEvolutivaService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esStaff: boolean = false; // Kinesiólogo
  esEstudiante: boolean = false;
  esGestion: boolean = false;

  // Estados UI
  cargandoHistorial = false;
  guardando = false;
  modoFormulario = false;
  modoSoloLectura = false;
  
  // Listas Globales
  listaAlumnos: any[] = [];
  listaKinesiologos: any[] = [];
  historialFichas: any[] = [];

  // Alumno en curso
  alumnoSeleccionado: any = null;

  // Formulario y Pestañas
  vistaFormulario = 'antecedentes';
  opcionesVistaForm = [
    { label: 'Antecedentes', value: 'antecedentes', icon: 'pi pi-info-circle' },
    { label: 'Evaluación Clínica', value: 'evaluacion', icon: 'pi pi-heartbeat' }
  ];

  // Estructura de la Ficha
  editandoId: string | null = null; // 🔥 Ajustado para que coincida con el servicio
  ficha: any = this.getFichaVacia();

  // Matrices dinámicas de la ficha
  listaArticulaciones: any[] = [];
  listaFuerzas: any[] = [];
  
  opcionesROM = [
    { label: '-', value: '-' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Limitado', value: 'Limitado' },
    { label: 'Aumentado', value: 'Aumentado' }
  ];

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esAdmin = this.rolActual === 'administrador';
      this.esEstudiante = this.rolActual === 'estudiante';
      this.esStaff = this.rolActual === 'kinesiologo';
      this.esGestion = this.esAdmin || this.esStaff;

      if (this.esEstudiante) {
        await this.cargarMisDatos();
      } else {
        await this.cargarMaestros();
      }
    } catch (error) {
      this.mostrarError('Error inicializando el módulo.');
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (GESTIÓN: ADMIN / STAFF)
  // ==========================================
  async cargarMaestros() {
    try {
      // 🔥 Llamadas a promesas nativas y en paralelo usando UsuarioCentralService
      const [alumnosRes, kinesiologosRes] = await Promise.all([
        this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, limite: 2000, activo: true }),
        this.usuarioService.listarUsuarios({ rol: Rol.KINESIOLOGO, limite: 1000 })
      ]);

      this.listaAlumnos = (alumnosRes.registros || []).map((est: any) => {
        const idUsuario = est.id_usuario || est.id; // Extraído directo del perfil
        const nombre = est.nombre;
        const apellido = est.apellido;
        const rut = est.rut;
        return {
            id: idUsuario,
            nombreCompleto: `${nombre} ${apellido} (${rut || 'Sin RUT'})`,
            nombre: nombre,
            apellido: apellido
        };
      });

      this.listaKinesiologos = (kinesiologosRes.registros || []).map((k: any) => ({
        id: k.id_usuario || k.id,
        nombreCompleto: `${k.nombre} ${k.apellido}`,
        nombre: k.nombre,
        apellido: k.apellido
      }));

    } catch (error) {
      this.mostrarError('Error al cargar la base de pacientes y especialistas.');
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
  }

  async onAlumnoChange() {
    if (!this.alumnoSeleccionado) {
      this.historialFichas = [];
      return;
    }
    
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    try {
      // 🔥 Promesa nativa
      this.historialFichas = await this.fichaEvolutivaService.listarFichasPorEstudiante(this.alumnoSeleccionado.id) || [];
    } catch (error) {
      this.mostrarError('Error al cargar el historial del paciente.');
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CARGA DE DATOS (VISTA ESTUDIANTE)
  // ==========================================
  async cargarMisDatos() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    try {
      // 🔥 Promesa nativa
      const data = await this.fichaEvolutivaService.listarMisFichas();
      this.historialFichas = data || [];
      this.historialFichas.sort((a: any, b: any) => new Date(b.fecha_evaluacion).getTime() - new Date(a.fecha_evaluacion).getTime());
    } catch (error) {
      this.mostrarError('Error al cargar tu historial de atenciones.');
    } finally {
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // LÓGICA DEL FORMULARIO Y MATRICES
  // ==========================================
  abrirNuevaFicha() {
    if (!this.alumnoSeleccionado && !this.esEstudiante) return;
    
    this.ficha = this.getFichaVacia();
    this.listaArticulaciones = this.generarArticulacionesPorDefecto();
    this.listaFuerzas = [];
    this.editandoId = null;
    this.modoSoloLectura = false;
    this.modoFormulario = true;
    this.vistaFormulario = 'antecedentes';

    // Auto-asignar el kinesiólogo si es staff
    if (this.esStaff) {
      this.authService.obtenerSesionActual().then(session => {
        if (session?.user?.id) {
          this.ficha.kinesiologoId = session.user.id;
        }
      });
    }
  }

  abrirEditarFicha(fichaBd: any) {
    this.prepararFichaParaEdicion(fichaBd);
    this.modoSoloLectura = false;
    this.modoFormulario = true;
  }

  abrirVerFicha(fichaBd: any) {
    this.prepararFichaParaEdicion(fichaBd);
    this.modoSoloLectura = true;
    this.modoFormulario = true;
  }

  volverAlHistorial() {
    this.modoFormulario = false;
    this.ficha = this.getFichaVacia();
  }

  private prepararFichaParaEdicion(fichaBd: any) {
    this.editandoId = fichaBd.id;
    this.vistaFormulario = 'antecedentes';

    let fechaEv = new Date();
    if (fichaBd.fecha_evaluacion) {
        const parts = (fichaBd.fecha_evaluacion as string).split('T')[0].split('-');
        if (parts.length === 3) fechaEv = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    this.ficha = {
      estudianteId: fichaBd.estudiante_id,
      kinesiologoId: fichaBd.kinesiologo_id,
      kinesiologoNombre: fichaBd.kinesiologo?.nombre ? `${fichaBd.kinesiologo.nombre} ${fichaBd.kinesiologo.apellido}` : 'Desconocido',
      fechaEvaluacion: fechaEv,
      diagnosticoMedico: fichaBd.diagnostico_medico || '',
      antecedentesPersonales: fichaBd.antecedentes_personales || { mecanismoLesion: '', tiempoEvolucion: '', tratamientosRecibidos: '', examenesComplementarios: '', sintomasActuales: '', dolor: '' },
      antecedentesRemotos: fichaBd.antecedentes_remotos || { antecedentesSecundarios: '', antecedentesQuirurgicos: '', habitos: '', medicamentos: '' },
      inspeccionEstatica: fichaBd.inspeccion_estatica || { anterior: '', posterior: '', sagitalDer: '', sagitalIzq: '' },
      inspeccionDinamica: fichaBd.inspeccion_dinamica || { disfuncion: '', gruposMusc: '', sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: fichaBd.postura || { actitud: '', eess: '', eeii: '' },
      sensibilidad: fichaBd.sensibilidad || { anestesia: '', hipoestesia: '', disestesia: '', hiperestesia: '', parestesia: '' },
      marcha: fichaBd.marcha || '',
      coordinacion: fichaBd.coordinacion || { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false },
      balanceRomberg: fichaBd.balance_romberg || '',
      observacion: fichaBd.observacion || ''
    };

    if (fichaBd.rango_movimiento && fichaBd.rango_movimiento.length > 0) {
        this.listaArticulaciones = fichaBd.rango_movimiento;
    } else {
        this.listaArticulaciones = this.generarArticulacionesPorDefecto();
    }

    this.listaFuerzas = fichaBd.fuerza || [];
  }

  // --- MATRICES DINÁMICAS ---
  agregarFuerza() {
    this.listaFuerzas.push({ movimiento: '', escala: '' });
  }

  eliminarFuerza(index: number) {
    this.listaFuerzas.splice(index, 1);
  }

  // ==========================================
  // GUARDAR EN BASE DE DATOS
  // ==========================================
  async guardarFicha() {
    if (this.guardando) return;
    if (!this.ficha.fechaEvaluacion) {
        this.mostrarError('La fecha de evaluación es obligatoria.');
        return;
    }

    if (!this.ficha.kinesiologoId) {
        this.mostrarError('Debe asignar un kinesiólogo tratante.');
        return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      kinesiologoId: this.ficha.kinesiologoId,
      fechaEvaluacion: this.formatearFechaIso(this.ficha.fechaEvaluacion),
      diagnosticoMedico: this.ficha.diagnosticoMedico,
      antecedentesPersonales: this.ficha.antecedentesPersonales,
      antecedentesRemotos: this.ficha.antecedentesRemotos,
      inspeccionEstatica: this.ficha.inspeccionEstatica,
      inspeccionDinamica: this.ficha.inspeccionDinamica,
      rangoMovimiento: this.listaArticulaciones,
      fuerza: this.listaFuerzas,
      postura: this.ficha.postura,
      sensibilidad: this.ficha.sensibilidad,
      marcha: this.ficha.marcha,
      coordinacion: this.ficha.coordinacion,
      balanceRomberg: this.ficha.balanceRomberg,
      observacion: this.ficha.observacion
    };

    try {
      if (this.editandoId) {
        // 🔥 Promesa nativa
        await this.fichaEvolutivaService.actualizarFicha(this.editandoId, payload);
        this.mostrarExito('Ficha actualizada correctamente');
      } else {
        const payloadConEstudiante = { ...payload, estudianteId: this.alumnoSeleccionado.id };
        // 🔥 Promesa nativa
        await this.fichaEvolutivaService.crearFicha(payloadConEstudiante);
        this.mostrarExito('Ficha creada correctamente');
      }

      this.volverAlHistorial();
      await this.onAlumnoChange(); // Recargar historial del alumno activo
    } catch (error) {
      this.mostrarError('Ocurrió un error al guardar la ficha clínica.');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // HELPERS INTERNOS
  // ==========================================
  private getFichaVacia() {
    return {
      estudianteId: null, kinesiologoId: null, fechaEvaluacion: new Date(), diagnosticoMedico: '',
      antecedentesPersonales: { mecanismoLesion: '', tiempoEvolucion: '', tratamientosRecibidos: '', examenesComplementarios: '', sintomasActuales: '', dolor: '' },
      antecedentesRemotos: { antecedentesSecundarios: '', antecedentesQuirurgicos: '', habitos: '', medicamentos: '' },
      inspeccionEstatica: { anterior: '', posterior: '', sagitalDer: '', sagitalIzq: '' },
      inspeccionDinamica: { disfuncion: '', gruposMusc: '', sinCompensacion: false, conCompensacion: false, noLograMov: false },
      postura: { actitud: '', eess: '', eeii: '' },
      sensibilidad: { anestesia: '', hipoestesia: '', disestesia: '', hiperestesia: '', parestesia: '' },
      marcha: '',
      coordinacion: { dedoNariz: false, pinzaPulgarIndice: false, talonRodilla: false },
      balanceRomberg: '', observacion: ''
    };
  }

  private generarArticulacionesPorDefecto() {
    return [
      { nombre: 'Hombro', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' },
      { nombre: 'Codo', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' },
      { nombre: 'Muñeca', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' },
      { nombre: 'Cadera', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' },
      { nombre: 'Rodilla', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' },
      { nombre: 'Tobillo', derPasivo: '-', derActivo: '-', izqPasivo: '-', izqActivo: '-' }
    ];
  }

  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        const tzOffset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
    } catch {
        return '';
    }
  }

  mostrarExito(m: string) { this.messageService.add({ severity: 'success', summary: 'Éxito', detail: m }); }
  mostrarError(m: string) { this.messageService.add({ severity: 'error', summary: 'Error', detail: m }); }
}