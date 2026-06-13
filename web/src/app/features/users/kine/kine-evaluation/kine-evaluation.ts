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
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { HealthService } from '../../../../shared/services/health.service';
import { AcademyService } from '../../../../shared/services/academy.service';

@Component({
  selector: 'app-kine-evaluation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './kine-evaluation.html',
  styleUrls: ['./kine-evaluation.css']
})
export class KineEvaluationComponent implements OnInit {

  // --- DATOS ---
  sesiones: any[] = [];            
  sesionesOriginales: any[] = [];  
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  todosLosRangos: any[] = []; // <-- NUEVO: Para pintar los rangos

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;

  // --- ESTADOS UI ---
  loading: boolean = true; 
  displayViewDialog: boolean = false; // <-- Renombrado para que coincida con el modal del Ojo

  sesionVista: any = null;
  resultadosVista: any[] = []; 

  constructor(
    private authService: AuthService,
    private healthService: HealthService,
    private academyService: AcademyService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS (SOLO SUS GRUPOS Y FINALIZADAS)
  // ==========================================
  async cargarDatosIniciales() {
    this.loading = true;
    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      const { data: kine } = await this.healthService.getKineByEmail(user.email);

      if (kine) {
        const { data: gruposData } = await this.healthService.getGruposDeKine(kine.id);
        
        this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
        const misGrupoIds = this.grupos.map(g => g.id);

        const { data: tData } = await this.healthService.getTiposEvaluacion();
        this.tiposEvaluacion = tData || [];

        // Traemos también los rangos
        const { data: rData } = await this.healthService.getAllRangos();
        this.todosLosRangos = rData || [];

        if (misGrupoIds.length > 0) {
          const { data: sData } = await this.healthService.getSesionesEvaluacionPorGrupos(misGrupoIds);
          
          // 🔥 SOLUCION: Filtramos por FINALIZADO y mapeamos los nombres que faltan
          this.sesionesOriginales = (sData || [])
            .filter((s: any) => s.estado === 'FINALIZADO')
            .map((s: any) => ({
                ...s,
                tipo_evaluacion: s.tipo_evaluacion || this.tiposEvaluacion.find(t => t.id === s.tipo_evaluacion_id),
                grupos: s.grupos || this.grupos.find(g => g.id === s.grupo_id)
            }));
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

        return cumpleFecha && cumpleGrupo && cumplePrueba;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
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
  // 3. VISTA DE RESULTADOS (OJO ACTUALIZADO)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.sesionVista = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
        const { data: alumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
        const resultadosBrutos = await this.healthService.prepararPlanillaCalificaciones(
            sesion.grupo_id, 
            sesion.id, 
            alumnos || []
        );

        this.resultadosVista = resultadosBrutos
            .filter((e: any) => e.valor_numerico !== null || (e.observacion && e.observacion.trim() !== ''))
            .map((e: any) => {
                const alumnoData: any = (alumnos || []).find((a: any) => a.id === e.estudiante_id);
                const fechaNac = alumnoData ? alumnoData.fecha_nacimiento : null;

                const edad = this.calcularEdadParaTest(fechaNac, sesion.fecha);
                const rango = this.obtenerRangoParaNota(e.valor_numerico, edad, sesion.tipo_evaluacion_id);

                return {
                    ...e,
                    etiqueta: rango ? rango.nombre_etiqueta : 'Registrado',
                    color: rango ? rango.color_sugerido : '#6b7280'
                };
            });

        this.displayViewDialog = true;

    } catch (e: any) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el informe de pacientes.' });
    } finally {
        this.loading = false;
        setTimeout(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
        }, 0);
    }
  }

  // --- Funciones Matemáticas para los Rangos ---
  calcularEdadParaTest(fechaNacimiento: string, fechaTest: string): number {
      if (!fechaNacimiento) return 0;
      const nac = new Date(fechaNacimiento);
      const test = new Date(fechaTest);
      let edad = test.getFullYear() - nac.getFullYear();
      const m = test.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && test.getDate() < nac.getDate())) {
          edad--;
      }
      return Math.max(0, edad);
  }

  obtenerRangoParaNota(valor: number, edad: number, tipo_evaluacion_id: number): any {
      if (valor === null || valor === undefined) return null;
      
      const idPrueba = Number(tipo_evaluacion_id);
      
      const rangosPosibles = this.todosLosRangos.filter(r => 
          Number(r.tipo_evaluacion_id) === idPrueba &&
          edad >= Number(r.edad_min) && edad <= Number(r.edad_max)
      );

      return rangosPosibles.find(r => valor >= Number(r.valor_min) && valor <= Number(r.valor_max)) || null;
  }
}