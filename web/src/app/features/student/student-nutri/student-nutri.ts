import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
// Importaciones de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-student-nutri',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DatePickerModule, SelectModule, TooltipModule
  ],
  templateUrl: './student-nutri.html',
  styleUrls: ['./student-nutri.css'] // Utiliza el mismo CSS
})
export class StudentNutriComponent implements OnInit {
  
  loading = false;
  estudianteId: string | null = null;
  
  misResultados: any[] = [];
  resultadosFiltrados: any[] = [];
  
  // Opciones para el filtro generadas dinámicamente
  tiposEvaluacionDisponibles: any[] = []; 
  
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarMisResultados();
  }

  async cargarMisResultados() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      // 1. Obtener el usuario logueado y buscar su ID de estudiante
      const { data: { user } } = await this.supabase.getUser();
      if (user) {
        const { data: estudiante } = await this.supabase.supabase
          .from('estudiantes')
          .select('id')
          .eq('email', user.email)
          .single();
        this.estudianteId = estudiante?.id;
      }

      if (!this.estudianteId) return;

      // 2. Traer resultados desde BD
      const res = await this.supabase.getResultadosNutriEstudiante(this.estudianteId);
      
      // ✅ Forzamos el tipo any[] para evitar errores de compilación estrictos de TS
      const rawData: any[] = res.data || [];

      // 3. Mapear datos
      this.misResultados = rawData
        .map(r => {
          // ✅ Normalizamos por si Supabase lo devuelve como Array o como Objeto
          const ev = Array.isArray(r.evaluacion) ? r.evaluacion[0] : r.evaluacion;
          const tipoEv = ev ? (Array.isArray(ev.tipo_evaluacion) ? ev.tipo_evaluacion[0] : ev.tipo_evaluacion) : null;
          
          return {
            ...r,
            eval_obj: ev,
            tipo_nombre_obj: tipoEv?.nombre
          };
        })
        .filter(r => r.eval_obj?.estado === 'FINALIZADO') // Solo los listos
        .map(r => {
           // Limpiar nombre de URL
           let nombreLimpio = 'Documento PDF';
           if (r.archivo_url) {
              const urlParts = r.archivo_url.split('/');
              const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
              const underscoreIndex = rawName.indexOf('_');
              nombreLimpio = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
           }

           return {
              fecha: r.eval_obj?.fecha,
              tipo_nombre: r.tipo_nombre_obj,
              observacion: r.observaciones,
              archivo_url: r.archivo_url,
              nombre_archivo: nombreLimpio
           };
        })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); // Más recientes primero

      // 4. Extraer tipos de evaluación únicos para el dropdown de filtros
      const tiposUnicos = new Set(this.misResultados.map(r => r.tipo_nombre));
      this.tiposEvaluacionDisponibles = Array.from(tiposUnicos).map(nombre => ({ nombre }));

      this.aplicarFiltros();

    } catch (error) {
      console.error('Error cargando resultados del estudiante', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltros() {
    this.resultadosFiltrados = this.misResultados.filter(r => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        const dFiltro = this.filtroFecha.toISOString().split('T')[0];
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