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

// 🚀 CAMBIO 1: Importamos los servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { HealthService } from '../../../../core/services/health.service';
import { AcademyService } from '../../../../core/services/academy.service';

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
  estudiantesGrupo: any[] = [];    

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;

  // --- ESTADOS UI ---
  loading: boolean = true; 
  displayGradesDialog: boolean = false; 

  evalLogistica: any = {};

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios
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
      // 🚀 CAMBIO 3: Obtenemos el usuario con authService
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      // 🚀 CAMBIO 4: Buscamos el Kine con la función que hicimos antes
      const { data: kine } = await this.healthService.getKineByEmail(user.email);

      if (kine) {
        // 🚀 CAMBIO 5: Traemos sus grupos
        const { data: gruposData } = await this.healthService.getGruposDeKine(kine.id);
        
        this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
        const misGrupoIds = this.grupos.map(g => g.id);

        const { data: tData } = await this.healthService.getTiposEvaluacion();
        this.tiposEvaluacion = tData || [];

        if (misGrupoIds.length > 0) {
          // 🚀 CAMBIO 6: Usamos la nueva función del healthService
          const { data: sData } = await this.healthService.getSesionesEvaluacionPorGrupos(misGrupoIds);
                    
          // ✅ SOLO GUARDAMOS LAS FINALIZADAS
          this.sesionesOriginales = (sData || []).filter((s: any) => s.estado === 'FINALIZADO');
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
  // 3. VISUALIZACIÓN DE RESULTADOS (SOLO LECTURA)
  // ==========================================
  async abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      // 🚀 CAMBIO 7: Traemos alumnos con academyService
      const { data: alumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);

      // 🚀 CAMBIO 8: ¡Reutilizamos la lógica que creamos para el Admin!
      this.estudiantesGrupo = await this.healthService.prepararPlanillaCalificaciones(
        sesion.grupo_id, 
        sesion.id, 
        alumnos || []
      );
      
      this.displayGradesDialog = true;

    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de pacientes.' });
    } finally {
      this.loading = false;
      
      // ✅ EL DESPERTADOR DEFINITIVO DE ANGULAR (Mantenido)
      setTimeout(() => {
          this.cdr.markForCheck();
          this.cdr.detectChanges();
      }, 0);
    }
  }
}