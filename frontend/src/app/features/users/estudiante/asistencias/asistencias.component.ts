import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

// PrimeNG Modules
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios de Dominio
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';

@Component({
  selector: 'app-estudiante-asistencias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    SelectModule,
    ButtonModule,
    ProgressBarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './asistencias.component.html',
  styleUrl: './asistencias.component.css',
})
export class EstudianteAsistenciasComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private asistenciaService = inject(AsistenciaService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = false;
  hasData: boolean = false; // Control para el gráfico circular
  hasYearlyData: boolean = false; // Control para el gráfico de barras

  selectedYear: number = new Date().getFullYear();
  selectedMonth: number | null = null; 

  years = [
    { label: '2024', value: 2024 },
    { label: '2025', value: 2025 },
    { label: '2026', value: 2026 },
    { label: '2027', value: 2027 }
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

  // Guardamos las clases cacheadas para no volver a llamar al servidor al cambiar de filtro
  clasesCacheadas: any[] = [];

  ngOnInit() {
    this.initOptions();
    this.cargarDatosEstadisticos();
  }

  cargarDatosEstadisticos() {
    this.loading = true;
    this.cdr.detectChanges(); 

    // ✅ Ejecutamos ambas peticiones en paralelo
    forkJoin({
      clases: this.claseService.obtenerMisClases(),
      asistencias: this.asistenciaService.obtenerMisAsistencias()
    }).subscribe({
      next: ({ clases, asistencias }) => {
        
        const asistenciasMap = new Map();
        asistencias.forEach(a => asistenciasMap.set(a.clase_id, a.presente));

        // Cruzamos las clases con su asistencia
        this.clasesCacheadas = clases.map(clase => ({
          ...clase,
          presente: asistenciasMap.has(clase.id) ? asistenciasMap.get(clase.id) : null
        }));

        this.procesarEstadisticas();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las estadísticas.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ Se llama también al cambiar el combo de Año o Mes (ahora sin llamar a BD)
  procesarEstadisticas() {
    // Extraemos año y mes del string 'YYYY-MM-DD' para evitar problemas de timezone
    const getAnio = (fecha: string) => parseInt(fecha.substring(0, 4), 10);
    const getMes = (fecha: string) => parseInt(fecha.substring(5, 7), 10) - 1; // 0-indexed

    // 1. Filtro estricto para el resumen y gráfico circular
    let filtradas = this.clasesCacheadas.filter(c => 
      c.fecha && 
      getAnio(c.fecha as string) === this.selectedYear && 
      (c.presente === true || c.presente === false)
    );

    if (this.selectedMonth !== null) {
      filtradas = filtradas.filter(c => getMes(c.fecha as string) === this.selectedMonth);
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

    this.clasesCacheadas.forEach(clase => {
      if (clase.fecha && clase.presente === true && getAnio(clase.fecha as string) === this.selectedYear) {
        const mes = getMes(clase.fecha as string);
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
    
    this.cdr.detectChanges(); 
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
                  padding: 8, 
                  font: { size: 14 } 
              }
          }
      },
      cutout: '70%' 
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