import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService
import { forkJoin } from 'rxjs';

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado

// Servicios de Dominio
import { KineResultadoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/resultados/service/resultado.service';
import { KineSubevaluacionService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/subevaluaciones/services/subevaluacion.service';
import { KineRangoService } from '../../../../core/domains/salud/kinesiologia/evaluaciones/rangos/services/rango.service';

@Component({
  selector: 'app-student-kine-evaluation',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    DialogModule,
    TagModule, 
    ToastModule, 
    TooltipModule, 
    ProgressSpinnerModule,
    ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './evaluaciones-kine.component.html',
  styleUrls: ['./evaluaciones-kine.component.scss'] // 🔥 Cambiado a .scss
})
export class StudentKineEvaluationComponent implements OnInit {

  private kineResultadoService = inject(KineResultadoService);
  private kineSubService = inject(KineSubevaluacionService);
  private kineRangoService = inject(KineRangoService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  sesiones: any[] = [];
  loading: boolean = false;
  rangos: any[] = [];

  // Modal de vista
  displayViewDialog: boolean = false;
  sesionVista: any = null;
  resultadosVista: any[] = [];
  cargandoResultados: boolean = false;

  ngOnInit() {
    this.cargarSesionesDelEstudiante();
  }

  // ==========================================
  // CARGA DE SESIONES DEL ESTUDIANTE
  // ==========================================
  cargarSesionesDelEstudiante() {
    this.loading = true;
    
    // ✅ Obtenemos todos los resultados del estudiante autenticado mediante su JWT
    this.kineResultadoService.listarMisResultados().subscribe({
      next: (data) => {
        const resultadosTotales = data || [];

        // Agrupamos los resultados únicos por sesión para armar la tabla principal
        const sesionesMap = new Map();
        resultadosTotales.forEach((r: any) => {
          const sesion = r.sesion || r.sesionEvaluacion || r.sesion_evaluacion;
          if (sesion && !sesionesMap.has(sesion.id)) {
            sesionesMap.set(sesion.id, {
              ...sesion,
              tipo_evaluacion: sesion.tipoEvaluacion || sesion.tipo_evaluacion || { nombre: 'Evaluación' }
            });
          }
        });

        this.sesiones = Array.from(sesionesMap.values());
        
        // Ordenar de más reciente a más antigua
        this.sesiones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus evaluaciones.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSeverityPuntaje(puntaje: number | string | null, subevaluacionId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    if (puntaje === null || puntaje === undefined || puntaje === '') return 'secondary';
    
    const puntajeNum = Number(puntaje);
    const rango = this.rangos.find(r => 
      (r.puntaje === puntajeNum || r.valor_min === puntajeNum || r.valorMin === puntajeNum) && 
      (r.subevaluacion_id === subevaluacionId || r.subevaluacionId === subevaluacionId)
    );
    
    const color = rango?.color || rango?.color_sugerido || rango?.colorSugerido;
    switch (color) {
      case 'rojo': case '#ef4444': return 'danger';
      case 'amarillo': case '#eab308': return 'warn';
      case 'verde': case '#22c55e': return 'success';
      default: return 'info';
    }
  }

  // ==========================================
  // VISTA DETALLADA DE RESULTADOS
  // ==========================================
  async verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.cargandoResultados = true;
    this.displayViewDialog = true;
    this.cdr.detectChanges();

    const tipoId = sesion.tipo_evaluacion_id || sesion.tipoEvaluacionId;

    forkJoin({
      subevaluaciones: this.kineSubService.listarSubevaluacionesPorTipo(tipoId),
      resultados: this.kineResultadoService.listarMisResultados()
    }).subscribe({
      next: ({ subevaluaciones, resultados }) => {
        const subsDefinidas = subevaluaciones || [];
        
        // Filtramos solo los resultados correspondientes a esta sesión específica
        const resultadosDeSesion = resultados.filter((r: any) => {
          const s = r.sesion || r.sesionEvaluacion || r.sesion_evaluacion;
          return s && s.id === sesion.id;
        });

        // Obtenemos los rangos en paralelo para cada subevaluación
        const peticionesRangos = subsDefinidas.map((sub: any) => this.kineRangoService.listarRangosPorSubevaluacion(sub.id));

        const procesarTabla = () => {
          this.resultadosVista = subsDefinidas.map((sub: any) => {
            const resGuardado: any = resultadosDeSesion.find((r: any) => 
              (r.subevaluacion_id === sub.id || r.subevaluacionId === sub.id)
            );

            return {
              subevaluacion_id: sub.id,
              nombre_parametro: sub.nombre,
              resultado_unico: (resGuardado && (resGuardado.resultado_unico != null || resGuardado.resultadoUnico != null)) ? Number(resGuardado.resultado_unico || resGuardado.resultadoUnico) : null,
              resultado_izquierdo: (resGuardado && (resGuardado.resultado_izquierdo != null || resGuardado.resultadoIzquierdo != null)) ? Number(resGuardado.resultado_izquierdo || resGuardado.resultadoIzquierdo) : null,
              resultado_derecho: (resGuardado && (resGuardado.resultado_derecho != null || resGuardado.resultadoDerecho != null)) ? Number(resGuardado.resultado_derecho || resGuardado.resultadoDerecho) : null,
              observacion: resGuardado ? resGuardado.observacion : '',
              tiene_datos: !!resGuardado
            };
          }).filter(e => e.tiene_datos); // Mostramos solo los parámetros evaluados

          this.cargandoResultados = false;
          this.cdr.detectChanges();
        };

        if (peticionesRangos.length > 0) {
          forkJoin(peticionesRangos).subscribe(rangosArrays => {
            this.rangos = rangosArrays.flat();
            procesarTabla();
          });
        } else {
          this.rangos = [];
          procesarTabla();
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar tus notas.' });
        this.cargandoResultados = false;
        this.displayViewDialog = false;
        this.cdr.detectChanges();
      }
    });
  }
}