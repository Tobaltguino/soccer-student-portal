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
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // 🔥 Agregado
import { MessageService, ConfirmationService } from 'primeng/api'; // 🔥 Agregado ConfirmationService

// Nuevo Servicio
import { NutriResultadoService } from '../../../../core/domains/salud/nutricion/resultados/services/resultado.service';

@Component({
  selector: 'app-estudiante-nutricion',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DatePickerModule, SelectModule, TooltipModule, ToastModule, ProgressSpinnerModule,
    ConfirmDialogModule // 🔥 Importado
  ],
  providers: [MessageService, ConfirmationService], // 🔥 Importado
  templateUrl: './nutricion.component.html',
  styleUrls: ['./nutricion.component.scss'] // 🔥 Cambiado a .scss
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
          // Normalizamos la relación (evaluacion o sesion dependiendo del backend)
          const ev = r.evaluacion || r.sesion || r.sesionEvaluacion || {};
          const tipoEv = ev.tipo_evaluacion || ev.tipoEvaluacion || {};
          
          // Limpiar nombre de URL para mostrar el nombre del archivo PDF
          const archivoUrl = r.archivo_url || r.archivoUrl;
          let nombreLimpio = 'Documento PDF';
          
          if (archivoUrl) {
            const urlParts = archivoUrl.split('/');
            const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
            const underscoreIndex = rawName.indexOf('_');
            nombreLimpio = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
          }

          return {
            fecha: ev.fecha,
            tipo_nombre: tipoEv.nombre || 'Evaluación Nutricional',
            observacion: r.observaciones || r.observacion || '',
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
        // Formateo manual para evitar desfases de zona horaria
        const anio = this.filtroFecha.getFullYear();
        const mes = ('0' + (this.filtroFecha.getMonth() + 1)).slice(-2);
        const dia = ('0' + this.filtroFecha.getDate()).slice(-2);
        const dFiltro = `${anio}-${mes}-${dia}`;
        cumpleFecha = r.fecha === dFiltro;
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
}