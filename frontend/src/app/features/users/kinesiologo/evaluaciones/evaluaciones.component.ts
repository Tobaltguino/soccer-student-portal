import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

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
    TagModule, ToastModule, TooltipModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.scss']
})
export class KinesiologoEvaluacionesComponent implements OnInit {

  private tipoEvalService = inject(TipoEvaluacionService);
  private sesionService = inject(SesionEvaluacionService);
  private resultadoService = inject(ResultadoEvaluacionService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  sesiones: any[] = [];            
  sesionesOriginales: any[] = [];  
  grupos: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantesGrupo: any[] = [];    

  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;

  loading: boolean = true; 
  displayGradesDialog: boolean = false; 

  evalLogistica: any = {};

  ngOnInit() {
    // 🔥 FIX: Diferimos la carga para evitar el NG0100 en la vista
    Promise.resolve().then(() => {
      this.cargarDatosIniciales();
    });
  }

  cargarDatosIniciales() {
    this.loading = true;
    this.cdr.markForCheck(); // Le avisamos a Angular que empezamos a cargar

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
            this.cdr.markForCheck();
          });
          return;
        }

        const peticionesSesiones = misGrupoIds.map(id => 
          this.sesionService.listarSesiones({ grupoId: id, limite: 1000 })
        );

        forkJoin({
          tipos: this.tipoEvalService.listarTiposEvaluacion(),
          sesionesGrupos: forkJoin(peticionesSesiones)
        }).subscribe({
          next: ({ tipos, sesionesGrupos }) => {
            this.tiposEvaluacion = tipos || [];
            
            const todasLasSesiones = sesionesGrupos.flatMap(res => res.registros);
            this.sesionesOriginales = todasLasSesiones.filter(s => s.estado === EstadoSesion.FINALIZADA);
            
            this.sesiones = [...this.sesionesOriginales];
            this.aplicarFiltros();
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al cargar sesiones.' });
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus grupos.' });
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

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

  /**
   * El backend no envía el grupo/tipo de evaluación embebido en la sesión,
   * solo los IDs. Los resolvemos localmente contra lo ya cargado.
   */
  obtenerNombreGrupo(sesion: any): string {
    const grupoId = sesion.grupo_id || sesion.grupoId;
    return this.grupos.find(g => g.id === grupoId)?.nombre || 'Grupo desconocido';
  }

  obtenerTipoEvaluacion(sesion: any): any {
    const tipoId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;
    return this.tiposEvaluacion.find(t => t.id === tipoId) || null;
  }

  abrirCalificador(sesion: any) {
    this.evalLogistica = { 
      ...sesion, 
      grupoNombre: this.obtenerNombreGrupo(sesion),
      tipoEvaluacionResuelto: this.obtenerTipoEvaluacion(sesion)
    };
    this.loading = true;
    
    const grupoIdToFetch = sesion.grupo_id || sesion.grupoId;

    forkJoin({
      alumnos: this.estudianteService.obtenerEstudiantesDeMiGrupo(),
      resultados: this.resultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: ({ alumnos, resultados }) => {

        const estudiantesFinales: any[] = [];
        const idsProcesados = new Set<string>();

        // 1. Pacientes actuales asignados a este grupo específico
        const alumnosFiltrados = (alumnos as any[]).filter((est: any) => est.grupo_id === grupoIdToFetch);

        alumnosFiltrados.forEach((est: any) => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
          const nombre = est.perfil ? est.perfil.nombre : est.nombre;
          const apellido = est.perfil ? est.perfil.apellido : est.apellido;

          const notaExistente: any = resultados.find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);

          idsProcesados.add(idUsuario);

          estudiantesFinales.push({
              estudiante_id: idUsuario,
              nombre: nombre,
              apellido: apellido,
              valor_numerico: notaExistente ? (notaExistente.valorNumerico || notaExistente.valor_numerico) : null,
              observacion: notaExistente ? notaExistente.observacion : '',
              rango: notaExistente ? notaExistente.rango : null, // 🔥 Pasamos el rango
              activoEnGrupo: true // 🔥 Identificador de paciente activo
          });
        });

        // 2. Pacientes antiguos con registro que ya no están en la lista actual
        resultados.forEach((r: any) => {
          const idUsuario = r.estudianteId || r.estudiante_id;
          
          if (!idsProcesados.has(idUsuario)) {
            estudiantesFinales.push({
              estudiante_id: idUsuario,
              nombre: r.alumno?.nombre || 'Desconocido', 
              apellido: r.alumno?.apellido || '',
              valor_numerico: r.valorNumerico || r.valor_numerico,
              observacion: r.observacion || '',
              rango: r.rango || null, // 🔥 Pasamos el rango
              activoEnGrupo: false // 🔥 Identificador para etiqueta de "Retirado"
            });
          }
        });
        
        this.estudiantesGrupo = estudiantesFinales;
        
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