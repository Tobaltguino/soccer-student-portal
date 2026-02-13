import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    SelectModule,
    ButtonModule,
    ProgressBarModule
  ],
  templateUrl: './student-attendance.html',
  styleUrl: './student-attendance.css',
})
export class StudentAttendanceComponent implements OnInit {
  loading: boolean = false;
  hasData: boolean = false; // Control para el gráfico circular
  hasYearlyData: boolean = false; // Control para el gráfico de barras

  selectedYear: number = new Date().getFullYear();
  selectedMonth: number | null = null; 

  years = [
    { label: '2024', value: 2024 },
    { label: '2025', value: 2025 },
    { label: '2026', value: 2026 }
  ];

  months = [
    { label: 'Todo el año', value: null },
    { label: 'Enero', value: 0 }, { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 }, { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 }, { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 }, { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 }, { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 }, { label: 'Diciembre', value: 11 }
  ];

  pieData: any;
  pieOptions: any;
  barData: any;
  barOptions: any;

  totalAsistidas: number = 0;
  porcentajeAsistencia: number = 0;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initOptions();
    this.cargarDatosEstadisticos();
  }

  async cargarDatosEstadisticos() {
    this.loading = true;
    this.cdr.detectChanges(); // Despierta a Angular para mostrar el loading

    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (!user) return;

      const inicioAnio = `${this.selectedYear}-01-01`;
      const { data, error } = await this.supabaseService.getClasesAlumno(user.id, inicioAnio);

      if (error) throw error;
      this.procesarEstadisticas(data || []);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Despierta a Angular al finalizar la carga
    }
  }

  procesarEstadisticas(clases: any[]) {
    // 1. Filtro estricto para el resumen y gráfico circular
    let filtradas = clases.filter(c => 
      new Date(c.fecha).getFullYear() === this.selectedYear && 
      (c.presente === true || c.presente === false)
    );

    if (this.selectedMonth !== null) {
      filtradas = filtradas.filter(c => new Date(c.fecha).getUTCMonth() === this.selectedMonth);
    }

    this.hasData = filtradas.length > 0;

    const asistidas = filtradas.filter(c => c.presente === true).length;
    const faltas = filtradas.filter(c => c.presente === false).length;
    
    this.totalAsistidas = asistidas;
    const total = filtradas.length;
    this.porcentajeAsistencia = total > 0 ? Math.round((asistidas / total) * 100) : 0;

    if (this.hasData) {
      this.pieData = {
        labels: ['Asistidas (Verde)', 'Faltas (Rojo)'],
        datasets: [{
          data: [asistidas, faltas],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0
        }]
      };
    }

    // 2. Gráfico de barras anual
    const countsPorMes = new Array(12).fill(0);
    let totalAnual = 0;

    clases.forEach(clase => {
      if (clase.presente === true && new Date(clase.fecha).getFullYear() === this.selectedYear) {
        const mes = new Date(clase.fecha).getUTCMonth();
        countsPorMes[mes]++;
        totalAnual++;
      }
    });

    this.hasYearlyData = totalAnual > 0;

    this.barData = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [{
        label: 'Asistencias',
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        data: countsPorMes,
        barPercentage: 0.6
      }]
    };
    
    this.cdr.detectChanges(); // Asegura que los gráficos se dibujen con los nuevos datos
  }

  initOptions() {
    this.pieOptions = {
      maintainAspectRatio: false,
      plugins: {
          legend: {
              display: true,
              position: 'bottom',
              labels: { 
                  usePointStyle: true, 
                  padding: 8, // ✅ Reducido de 10 o 20 para ahorrar espacio en el celular
                  font: { size: 14 } // ✅ Fuente un poco más pequeña para el móvil
              }
          }
      },
      cutout: '70%' // ✅ Un poco más grueso ayuda a que se vea mejor en pantallas pequeñas
  };

    this.barOptions = {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { 
                ticks: { font: { size: 10 } },
                grid: { display: false } 
            },
            y: { 
                beginAtZero: true, 
                suggestedMax: 5, 
                ticks: { stepSize: 1, font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.05)' } 
            }
        }
    };
  }
}