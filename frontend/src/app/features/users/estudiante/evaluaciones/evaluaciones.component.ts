import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService

// Nuevo Servicio
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';

@Component({
  selector: 'app-estudiante-evaluaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, DatePickerModule, SelectModule, TooltipModule, ToastModule,
    ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.scss'] // 🔥 Cambiado a .scss
})
export class EstudianteEvaluacionesComponent implements OnInit {
  
  private resultadoService = inject(ResultadoEvaluacionService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  evaluaciones: any[] = [];
  evaluacionesOriginales: any[] = [];
  tiposTests: any[] = [];
  loading: boolean = true;

  // Filtros
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  // Modal
  displayDetalle: boolean = false;
  selectedEval: any = null;

  ngOnInit() {
    this.cargarEvaluaciones();
  }

  cargarEvaluaciones() {
    this.loading = true;
    
    this.resultadoService.listarMisResultados().subscribe({
      next: (data) => {
        this.evaluacionesOriginales = (data || []).map((r: any) => {
            const evaluacion = r.evaluacion || {};
            const rango = r.rango || {};

            return {
                fecha: evaluacion.fecha,
                test_nombre: evaluacion.nombre || 'Evaluación',
                edad_evaluacion: r.edadEvaluacion ?? 0,
                resultado: r.valorNumerico || r.valor_numerico,
                unidad: evaluacion.unidadMedida || evaluacion.unidad_medida || '',
                nivel: rango.nombreEtiqueta || rango.nombre_etiqueta || 'Registrado',
                color: rango.colorSugerido || rango.color_sugerido || '#3b82f6',
                test_descripcion: evaluacion.descripcion || '',
                observacion: r.observacion || '',
                created_at: r.createdAt || r.created_at || new Date().toISOString()
            };
        });

        this.evaluacionesOriginales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const nombresUnicos = [...new Set(this.evaluacionesOriginales.map(e => e.test_nombre))];
        this.tiposTests = nombresUnicos.map(nombre => ({ nombre: nombre }));

        this.aplicarFiltros();
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

  aplicarFiltros() {
    this.evaluaciones = this.evaluacionesOriginales.filter(e => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const fStr = this.formatearFecha(this.filtroFecha);
        cumpleFecha = e.fecha === fStr;
      }
      
      if (this.filtroPrueba) {
        cumplePrueba = e.test_nombre === this.filtroPrueba.nombre;
      }
      
      return cumpleFecha && cumplePrueba;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
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

  getNivelSeverity(nivel: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const n = nivel?.toLowerCase();
    if (n === 'alto') return 'success';
    if (n === 'medio') return 'warn';
    if (n === 'bajo') return 'danger';
    if (n === 'registrado') return 'info';
    return 'secondary';
  }

  verDetalle(evaluacion: any) {
    this.selectedEval = evaluacion;
    this.displayDetalle = true;
  }
}