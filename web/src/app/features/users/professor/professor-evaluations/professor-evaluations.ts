import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber'; 
import { SelectModule } from 'primeng/select'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButtonModule } from 'primeng/radiobutton';

import { MessageService, ConfirmationService } from 'primeng/api';

// 🚀 CAMBIO 1: Importamos nuestros servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';
import { HealthService } from '../../../../core/services/health.service';

@Component({
  selector: 'app-professor-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule, RadioButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './professor-evaluations.html',
  styleUrls: ['./professor-evaluations.css']
})
export class ProfessorEvaluationsComponent implements OnInit {

  // --- DATOS ---
  sesiones: any[] = [];            
  sesionesOriginales: any[] = [];  
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = [];    

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: any = null;

  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  // --- ESTADOS UI ---
  loading: boolean = true;
  displayMainDialog: boolean = false;   
  displayGradesDialog: boolean = false; 

  evalLogistica: any = {
    id: null,
    grupo_id: null,
    tipo_evaluacion_id: null,
    fecha: new Date(),
    estado: 'PENDIENTE'
  };

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios especializados
    private authService: AuthService,
    private academyService: AcademyService,
    private healthService: HealthService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS (SOLO SUS GRUPOS)
  // ==========================================
  async cargarDatosIniciales() {
    this.loading = true;
    try {
      // 🚀 CAMBIO 3: Validación segura con TypeScript para el correo
      const { data: { user } } = await this.authService.getUser();
      if (!user || !user.email) return;

      // 🚀 CAMBIO 4: Buscamos al profe
      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);

      if (prof) {
        // 🚀 CAMBIO 5: Buscamos sus grupos
        const { data: gruposData } = await this.academyService.getGruposDeProfesor(prof.id);
        
        this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
        const misGrupoIds = this.grupos.map(g => g.id);

        // 🚀 CAMBIO 6: Tipos de evaluación desde HealthService
        const { data: tData } = await this.healthService.getTiposEvaluacion();
        this.tiposEvaluacion = tData || [];

        // 🚀 CAMBIO 7: Sesiones desde HealthService
        if (misGrupoIds.length > 0) {
          const { data: sData, error: errorSesiones } = await this.healthService.getSesionesEvaluacionPorGrupos(misGrupoIds);
          
          if (!errorSesiones) {
             this.sesionesOriginales = sData || [];
          }
        } else {
          this.sesionesOriginales = [];
        }
        
        this.sesiones = [...this.sesionesOriginales];
        this.aplicarFiltros();
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar datos.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // 2. LÓGICA DE FILTRADO
  // ==========================================
  aplicarFiltros() {
    this.sesiones = this.sesionesOriginales.filter(sesion => {
        let cumpleFecha = true;
        let cumpleGrupo = true;
        let cumplePrueba = true;
        let cumpleEstado = true;

        if (this.filtroFecha) {
            const fechaFiltroStr = this.formatearFecha(this.filtroFecha);
            const fechaSesionStr = (sesion.fecha || '').substring(0, 10); 
            cumpleFecha = fechaSesionStr === fechaFiltroStr;
        }
        if (this.filtroGrupo) {
            cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
        }
        if (this.filtroPrueba) {
            cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
        }
        if (this.filtroEstado) {
            cumpleEstado = sesion.estado === this.filtroEstado;
        }

        return cumpleFecha && cumpleGrupo && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.sesiones = [...this.sesionesOriginales];
  }

  formatearFecha(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  }

  // ==========================================
  // 3. GESTIÓN DE SESIONES (LOGÍSTICA)
  // ==========================================
  abrirNuevo() {
    this.evalLogistica = { 
      id: null, 
      grupo_id: null, 
      tipo_evaluacion_id: null, 
      fecha: null, 
      estado: 'PENDIENTE' 
    };
    this.displayMainDialog = true;
  }

  editarSesion(sesion: any) {
    const fechaObj = new Date(sesion.fecha + 'T00:00:00');
    this.evalLogistica = { ...sesion, fecha: fechaObj };
    this.displayMainDialog = true;
  }

  async crearSesionPlanificada() {
    if (!this.evalLogistica.fecha || !this.evalLogistica.grupo_id || !this.evalLogistica.tipo_evaluacion_id) {
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'Faltan datos', 
          detail: 'Complete todos los campos obligatorios (*).' 
        });
        return;
    }

    const fechaSeleccionada = new Date(this.evalLogistica.fecha);
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Fecha Inválida', 
            detail: 'Ingrese una fecha válida para la sesión.' 
        });
        return;
    }

    const fechaStr = fechaSeleccionada.toISOString().split('T')[0];
    const payload = {
        grupo_id: this.evalLogistica.grupo_id,
        tipo_evaluacion_id: this.evalLogistica.tipo_evaluacion_id,
        fecha: fechaStr,
        estado: this.evalLogistica.estado || 'PENDIENTE'
    };

    try {
      let result;
      if (this.evalLogistica.id) {
          // 🚀 CAMBIO 8: Usamos HealthService
          result = await this.healthService.updateSesionEvaluacion(this.evalLogistica.id, payload);
      } else {
          // 🚀 CAMBIO 9: Usamos HealthService
          result = await this.healthService.crearSesionEvaluacion(payload);
      }

      if (result.error) throw result.error;

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión guardada' });
      this.displayMainDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  // ==========================================
  // 4. CALIFICACIÓN DE ESTUDIANTES
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      // 🚀 CAMBIO 10: Cruce optimizado usando los nuevos servicios
      const [resAlumnos, resResultados] = await Promise.all([
         this.academyService.getAlumnosPorGrupo(sesion.grupo_id),
         this.healthService.getResultadosPorSesion(sesion.id)
      ]);

      const alumnos = resAlumnos.data || [];
      const resultados = resResultados.data || [];

      this.estudiantesGrupo = alumnos.map((alumno: any) => {
          const notaExistente = resultados.find((r: any) => r.estudiante_id === alumno.id);
          return {
              estudiante_id: alumno.id,
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
      });
      
      this.displayGradesDialog = true;

    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de estudiantes.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  limpiarFila(estudiante: any) {
    estudiante.valor_numerico = null;
    estudiante.observacion = '';
  }

  async guardarNotasFinales() {
    const notasAGuardar = this.estudiantesGrupo
      .filter(e => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''))
      .map(e => ({
        sesion_id: this.evalLogistica.id, 
        estudiante_id: e.estudiante_id,
        valor_numerico: e.valor_numerico,
        observacion: e.observacion || ''
      }));

    if (notasAGuardar.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay notas para guardar.' });
      return;
    }

    this.loading = true;
    try {
      // 🚀 CAMBIO 11: Usamos HealthService para guardar el bloque de notas
      const { error } = await this.healthService.guardarResultadosMasivos(notasAGuardar);
      if (error) throw error; 

      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Resultados actualizados correctamente' });
      this.displayGradesDialog = false;
      this.cargarDatosIniciales(); 
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al guardar resultados.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}