import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

// 🚀 CAMBIO 1: Importamos los servicios de dominio correspondientes
import { AuthService } from '../../../../core/services/auth.service';
import { HealthService } from '../../../../core/services/health.service';

@Component({
  selector: 'app-student-evaluations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, DatePickerModule, SelectModule, TooltipModule
  ],
  templateUrl: './student-evaluations.html',
  styleUrls: ['./student-evaluations.css']
})
export class StudentEvaluationsComponent implements OnInit {
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

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios especializados
    private authService: AuthService, 
    private healthService: HealthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarEvaluaciones();
  }

  async cargarEvaluaciones() {
    this.loading = true;
    try {
      // 🚀 CAMBIO 3: Validación segura con AuthService
      const { data: { user } } = await this.authService.getUser();
      
      if (user) {
        // Prevención de colapso: 6 meses
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - -6);
        // Aunque el servicio ya filtra, pasamos la fecha para mayor control
        const fechaDesde = seisMesesAtras.toISOString().split('T')[0];

        // 🚀 CAMBIO 4: Usamos HealthService para obtener los resultados del alumno
        const { data, error } = await this.healthService.getEvaluacionesAlumno(user.id as string);
        if (error) throw error;

        // Mapeamos los datos para que coincidan con la estructura que espera tu HTML
        // (Ajustando nombres de campos si el servicio devuelve relaciones anidadas)
        this.evaluacionesOriginales = (data || []).map((e: any) => ({
          ...e,
          test_nombre: e.evaluacion_sesiones?.evaluacion_tipos?.nombre || 'Test',
          unidad_medida: e.evaluacion_sesiones?.evaluacion_tipos?.unidad_medida || '',
          fecha: e.evaluacion_sesiones?.fecha
        })).sort((a, b) => {
          const tA = new Date(a.created_at).getTime();
          const tB = new Date(b.created_at).getTime();
          return tB - tA;
        });

        // Extraer nombres únicos de los tests para el selector de filtros
        const nombresUnicos = [...new Set(this.evaluacionesOriginales.map(e => e.test_nombre))];
        this.tiposTests = nombresUnicos.map(nombre => ({ nombre: nombre }));

        this.aplicarFiltros();
      }
    } catch (error) {
      console.error('Error cargando evaluaciones del alumno:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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