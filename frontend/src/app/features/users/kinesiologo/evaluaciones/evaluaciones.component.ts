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
import { SupabaseService } from '../../../../../core/services/supabase.service';

@Component({
  selector: 'app-kinesiologo-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.css']
})
export class KinesiologoEvaluacionesComponent implements OnInit {

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
    private supabase: SupabaseService,
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
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      const { data: kine } = await this.supabase.supabase
          .from('kinesiologos')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

      if (kine) {
        const { data: gruposData } = await this.supabase.getGruposDeKine(kine.id);
        
        this.grupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
        const misGrupoIds = this.grupos.map(g => g.id);

        const { data: tData } = await this.supabase.getTiposEvaluacion();
        this.tiposEvaluacion = tData || [];

        if (misGrupoIds.length > 0) {
          const { data: sData, error: errorSesiones } = await this.supabase.getSesionesEvaluacionPorGrupos(misGrupoIds);
                    
          // ✅ SOLO GUARDAMOS LAS FINALIZADAS
          this.sesionesOriginales = (sData || []).filter(s => s.estado === 'FINALIZADO');
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
    this.cdr.detectChanges(); // Primer llamado para mostrar el círculo de carga

    try {
      const [resAlumnos, resResultados] = await Promise.all([
         this.supabase.getAlumnosPorGrupo(sesion.grupo_id),
         this.supabase.getResultadosPorSesion(sesion.id)
      ]);

      const alumnos = resAlumnos.data || [];
      const resultados = resResultados.data || [];

      this.estudiantesGrupo = alumnos.map((alumno: any) => {
          const notaExistente = resultados.find((r: any) => r.estudiante_id === alumno.id);
          return {
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              valor_numerico: notaExistente ? notaExistente.valor_numerico : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
      });
      
      this.displayGradesDialog = true;

    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de pacientes.' });
    } finally {
      this.loading = false;
      
      // ✅ EL DESPERTADOR DEFINITIVO DE ANGULAR
      // Lo metemos en un setTimeout de 0ms para obligar a Angular a dibujar el modal en el siguiente ciclo del procesador.
      setTimeout(() => {
          this.cdr.markForCheck();
          this.cdr.detectChanges();
      }, 0);
    }
  }
}