import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService

// Servicios de Dominio
import { TipoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/tipos/services/tipo-evaluacion.services';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

@Component({
  selector: 'app-kinesiologo-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule,
    TagModule, ToastModule, TooltipModule, ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.scss'] // 🔥 Cambiado a .scss
})
export class KinesiologoEvaluacionesComponent implements OnInit {

  private tipoEvalService = inject(TipoEvaluacionService);
  private sesionService = inject(SesionEvaluacionService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

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

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ==========================================
  // 1. CARGA DE DATOS (SOLO SUS GRUPOS Y FINALIZADAS)
  // ==========================================
  cargarDatosIniciales() {
    this.loading = true;

    // 1. Obtenemos los grupos del kinesiólogo
    this.grupoService.obtenerMisGrupos().subscribe({
      next: (gruposData) => {
        this.grupos = gruposData || [];
        const misGrupoIds = this.grupos.map(g => g.id).filter(id => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.tipoEvalService.listarTiposEvaluacion().subscribe(t => {
            this.tiposEvaluacion = t || [];
            this.sesionesOriginales = [];
            this.sesiones = [];
            this.loading = false;
            this.cdr.detectChanges();
          });
          return;
        }

        // 2. Armamos las peticiones para todos sus grupos
        const peticionesSesiones = misGrupoIds.map(id => 
          this.sesionService.listarSesiones({ grupoId: id, limite: 1000 })
        );

        // 3. Ejecutamos en paralelo Tipos de Evaluación + Sesiones
        forkJoin({
          tipos: this.tipoEvalService.listarTiposEvaluacion(),
          sesionesGrupos: forkJoin(peticionesSesiones)
        }).subscribe({
          next: ({ tipos, sesionesGrupos }) => {
            this.tiposEvaluacion = tipos || [];
            
            // Juntamos todas las sesiones y filtramos SOLO las FINALIZADAS
            const todasLasSesiones = sesionesGrupos.flatMap(res => res.registros);
            this.sesionesOriginales = todasLasSesiones.filter(s => s.estado === EstadoSesion.FINALIZADA);
            
            this.sesiones = [...this.sesionesOriginales];
            this.aplicarFiltros();
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar sesiones.' });
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus grupos.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // 2. LÓGICA DE FILTRADO
  // ==========================================
  aplicarFiltros() {
    this.sesiones = this.sesionesOriginales.filter(sesion => {
        let cumpleFecha = true;
        let cumpleGrupo = true;
        let cumplePrueba = true;

        const sGrupoId = sesion.grupo_id || sesion.grupoId;
        const sTipoEvalId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

        if (this.filtroFecha) {
            const fechaFiltroStr = this.formatearFecha(this.filtroFecha);
            const fechaSesionStr = (sesion.fecha || '').substring(0, 10); 
            cumpleFecha = fechaSesionStr === fechaFiltroStr;
        }
        if (this.filtroGrupo) {
            cumpleGrupo = sGrupoId === this.filtroGrupo.id;
        }
        if (this.filtroPrueba) {
            cumplePrueba = sTipoEvalId === this.filtroPrueba.id;
        }

        return cumpleFecha && cumpleGrupo && cumplePrueba;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.aplicarFiltros();
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
  abrirCalificador(sesion: any) {
    this.evalLogistica = { ...sesion };
    this.loading = true;
    
    const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ grupoIds: [grupoIdToFetch], limite: 1000, activo: true }),
      resultados: this.resultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: ({ alumnos, resultados }) => {
        
        this.estudiantesGrupo = alumnos.registros.map((est: any) => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
          const nombre = est.perfil ? est.perfil.nombre : est.nombre;
          const apellido = est.perfil ? est.perfil.apellido : est.apellido;

          const notaExistente: any = resultados.find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);
          
          return {
              nombre: nombre,
              apellido: apellido,
              valor_numerico: notaExistente ? (notaExistente.valorNumerico || notaExistente.valor_numerico) : null,
              observacion: notaExistente ? notaExistente.observacion : ''
          };
        });
        
        this.displayGradesDialog = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de pacientes.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}