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

import { AuthService } from '../../../../core/services/auth.service';
import { EvaluacionFisicaService } from '../../../../core/services/modulos/academico/evaluacion-fisica.service';

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
    private authService: AuthService, 
    private evaluacionFisicaService: EvaluacionFisicaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarEvaluaciones();
  }

  async cargarEvaluaciones() {
    this.loading = true;
    try {
      const { data: { user } } = await this.authService.getUser();
      
      if (user) {
        // Prevención de colapso: 6 meses (Corregido el error de los signos)
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6); 
        const fechaDesde = seisMesesAtras.toISOString().split('T')[0];

        const { data, error } = await this.evaluacionFisicaService.getEvaluacionesAlumno(user.id);
        if (error) throw error;

        // FILTRO: Dejamos pasar SOLO las evaluaciones cuya sesión esté FINALIZADA
        const evaluacionesCompletadas = (data || []).filter((e: any) => {
           const estado = e.estado_sesion || '';
           return estado.toUpperCase() === 'FINALIZADA' || estado.toUpperCase() === 'FINALIZADO';
        });

        // Mapeamos los datos YA FILTRADOS
        this.evaluacionesOriginales = evaluacionesCompletadas.map((e: any) => ({
          ...e,
          // Las propiedades test_nombre y unidad ya vienen formateadas desde el servicio, 
          // pero las aseguramos por si acaso:
          test_nombre: e.test_nombre || 'Test',
          unidad_medida: e.unidad || ''
        })).sort((a: any, b: any) => {
          const tA = new Date(a.created_at).getTime();
          const tB = new Date(b.created_at).getTime();
          return tB - tA; // Más recientes primero
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