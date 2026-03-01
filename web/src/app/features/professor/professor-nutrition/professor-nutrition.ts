import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
// Importaciones de PrimeNG
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-professor-nutrition',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, TooltipModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './professor-nutrition.html',
  styleUrls: ['./professor-nutrition.css'] // Usa el mismo CSS que admin-nutri
})
export class ProfessorNutritionComponent implements OnInit {
  
  // Datos
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];

  // Filtros
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  // Modales y Estado
  displayGradesDialog = false;
  loading = false;

  evalLogistica: any = {};

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarDatosBase();
  }

  async cargarDatosBase() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const resTipos = await this.supabase.getTiposEvaluacionNutri();
      this.tiposEvaluacion = resTipos.data || [];

      const resEst = await this.supabase.getEstudiantesBasico();
      this.estudiantes = (resEst.data || []).map(est => ({
        ...est,
        archivo_url_previo: null,
        nombre_archivo_previo: null,
        observacion: ''
      }));

      await this.cargarSesiones();

    } catch (error) {
      console.error('Error cargando datos', error);
      this.mostrarError('No se pudieron cargar los datos base.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarSesiones() {
    const res = await this.supabase.getEvaluacionesNutri();
    // ✅ Regla estricta: Solo guardamos en memoria las que están FINALIZADAS
    this.sesiones = (res.data || []).filter(s => s.estado === 'FINALIZADO');
    this.aplicarFiltros();
    this.cdr.detectChanges();
  }

  // --- LÓGICA DE FILTROS ---
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const dFiltro = this.filtroFecha.toISOString().split('T')[0];
        cumpleFecha = s.fecha === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = s.tipo_id === this.filtroPrueba.id;
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

  // --- LÓGICA MODAL: VER RESULTADOS ---
  async verResultados(sesion: any) {
    this.evalLogistica = sesion;
    
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const resResultados = await this.supabase.getResultadosPorSesionNutri(sesion.id);
      const resultadosPrevios = resResultados.data || [];

      this.estudiantes.forEach(est => {
        const resultadoGuardado = resultadosPrevios.find(r => r.estudiante_id === est.id);

        est.archivo_url_previo = resultadoGuardado ? resultadoGuardado.archivo_url : null;
        est.observacion = resultadoGuardado ? resultadoGuardado.observaciones : '';

        // Extraer nombre del archivo para mostrarlo limpio
        if (est.archivo_url_previo) {
          const urlParts = est.archivo_url_previo.split('/');
          const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
          const underscoreIndex = rawName.indexOf('_');
          est.nombre_archivo_previo = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
        } else {
          est.nombre_archivo_previo = null;
        }
      });

      this.displayGradesDialog = true;
    } catch (error) {
      console.error(error);
      this.mostrarError('Error al cargar los resultados de los estudiantes.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    this.cdr.detectChanges();
  }
}