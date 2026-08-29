import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importaciones de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Nuevo Servicio
import { NutriResultadoService } from '../../../../core/domains/salud/nutricion/resultados/services/resultado.service';

@Component({
  selector: 'app-estudiante-nutricion',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DatePickerModule, SelectModule, TooltipModule, ToastModule, ProgressSpinnerModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './nutricion.component.html',
  styleUrls: ['./nutricion.component.scss']
})
export class StudentNutriComponent implements OnInit {
  
  private nutriResultadoService = inject(NutriResultadoService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  
  misResultados: any[] = [];
  resultadosFiltrados: any[] = [];
  tiposEvaluacionDisponibles: any[] = []; 
  
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  ngOnInit() {
    this.cargarMisResultados();
  }

  cargarMisResultados() {
    this.loading = true;

    // ✅ El backend ya lee el JWT, busca a este estudiante y solo trae sesiones FINALIZADAS
    this.nutriResultadoService.listarMisResultados().subscribe({
      next: (data) => {
        const rawData = data || [];

        this.misResultados = rawData.map((r: any) => {
          // FIX: El backend envía "evaluacion" directamente con "nombre" y "fecha"
          const ev = r.evaluacion || {};
          
          // FIX: Propiedad estricta de base de datos
          const archivoUrl = r.archivo_url;
          let nombreLimpio = 'Documento PDF';
          
          if (archivoUrl) {
            const urlParts = archivoUrl.split('/');
            const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
            const underscoreIndex = rawName.indexOf('_');
            nombreLimpio = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
          }

          return {
            fecha: ev.fecha,
            tipo_nombre: ev.nombre || 'Evaluación Nutricional',
            // FIX: Propiedad estricta "observaciones" del DTO/BD
            observacion: r.observaciones || '',
            archivo_url: archivoUrl,
            nombre_archivo: nombreLimpio
          };
        });

        // Ordenamos por fecha de más reciente a más antiguo
        this.misResultados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // Extraemos tipos únicos para el selector de filtros
        const tiposUnicos = new Set(this.misResultados.map(r => r.tipo_nombre));
        this.tiposEvaluacionDisponibles = Array.from(tiposUnicos).map(nombre => ({ nombre }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus pautas nutricionales.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    this.resultadosFiltrados = this.misResultados.filter(r => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const dFiltro = this.formatearFechaIso(this.filtroFecha);
        // FIX: Evitamos error si r.fecha incluye hora en BD (ISO completo)
        cumpleFecha = (r.fecha || '').substring(0, 10) === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = r.tipo_nombre === this.filtroPrueba.nombre;
      }

      return cumpleFecha && cumplePrueba;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.aplicarFiltros();
  }

  // FIX: Unificamos el formateo de fecha para evitar desfases horarios
  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  }
}