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
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService

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
    ToastModule,
    ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.scss'], // 🔥 Cambiado a styleUrls y .scss
})
export class EstudianteAsistenciasComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private asistenciaService = inject(AsistenciaService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = false;
  hasData: boolean = false; 
  hasYearlyData: boolean = false; 

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

  clasesCacheadas: any[] = [];

  ngOnInit() {
    this.initOptions();
    this.cargarDatosEstadisticos();
  }

  cargarDatosEstadisticos() {
    this.loading = true;
    this.cdr.detectChanges();

    this.claseService.obtenerMisClases().subscribe({
      next: (clases) => {
        this.clasesCacheadas = clases;
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

  procesarEstadisticas() {
    const getAnio = (fecha: string) => parseInt(fecha.substring(0, 4), 10);
    const getMes = (fecha: string) => parseInt(fecha.substring(5, 7), 10) - 1; 

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
        labels: ['Asistidas', 'Faltas'],
        datasets: [{
          data: [asistidas, faltas],
          backgroundColor: ['#c6ff3d', '#ff5c5c'], // 🔥 Usando Colores Neon
          borderWidth: 0
        }]
      };
    }

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
        backgroundColor: '#3b82f6', // Azul Neon
        borderRadius: 4,
        data: countsPorMes,
        barPercentage: 0.5
      }]
    };
    
    this.cdr.detectChanges(); 
  }

  initOptions() {
    const textColor = '#eaf2f0';
    const textMuted = '#7c8b88';
    const gridColor = 'rgba(234, 242, 240, 0.08)'; // border-color

    this.pieOptions = {
      maintainAspectRatio: false,
      plugins: {
          legend: {
              display: true,
              position: 'bottom',
              labels: { 
                  usePointStyle: true, 
                  color: textColor, // 🔥 Letras Claras
                  padding: 15, 
                  font: { family: 'Oswald', size: 13 } 
              }
          }
      },
      cutout: '70%' 
    };

    this.barOptions = {
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false } 
        },
        scales: {
            x: { 
                ticks: { color: textMuted, font: { family: 'Oswald', size: 11 } },
                grid: { display: false } 
            },
            y: { 
                beginAtZero: true, 
                suggestedMax: 5, 
                ticks: { color: textMuted, stepSize: 1, font: { family: 'Inter', size: 11 } },
                grid: { color: gridColor } // 🔥 Grilla sutil
            }
        }
    };
  }
}