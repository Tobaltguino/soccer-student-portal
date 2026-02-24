import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Necesario para ngModel

// PrimeNG
import { SupabaseService } from '../../../core/services/supabase.service'; 
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext'; // ✅ Nuevo
import { DatePickerModule } from 'primeng/datepicker'; // ✅ Nuevo

@Component({
  selector: 'app-student-view-guides',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    ButtonModule, 
    TooltipModule, 
    TableModule,
    InputTextModule,
    DatePickerModule
  ],
  templateUrl: './student-view-guides.html',
  styleUrls: ['./student-view-guides.css']
})
export class StudentViewGuidesComponent implements OnInit {
  guias: any[] = [];
  guiasFiltradas: any[] = []; // ✅ Nueva lista para mostrar en la tabla
  loading: boolean = true;

  // --- FILTROS ---
  filtroTitulo: string = '';
  filtroFecha: Date | null = null;

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGuias();
  }

  async cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.supabase.getGuias();
      if (error) throw error;
      
      this.guias = data || [];
      this.guiasFiltradas = [...this.guias]; // Copiamos los datos iniciales
      
    } catch (error) {
      console.error('Error al cargar material de estudio:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // --- LÓGICA DE FILTRADO ---
  aplicarFiltros() {
    this.guiasFiltradas = this.guias.filter(guia => {
      // 1. Filtrar por Título
      const coincideTitulo = guia.titulo.toLowerCase().includes(this.filtroTitulo.toLowerCase());
      
      // 2. Filtrar por Fecha
      let coincideFecha = true;
      if (this.filtroFecha) {
        const fechaGuia = new Date(guia.created_at);
        const fechaFiltro = new Date(this.filtroFecha);
        
        // Comparamos año, mes y día para ignorar las horas
        coincideFecha = fechaGuia.getFullYear() === fechaFiltro.getFullYear() &&
                        fechaGuia.getMonth() === fechaFiltro.getMonth() &&
                        fechaGuia.getDate() === fechaFiltro.getDate();
      }

      return coincideTitulo && coincideFecha;
    });
  }

  limpiarFiltros() {
    this.filtroTitulo = '';
    this.filtroFecha = null;
    this.guiasFiltradas = [...this.guias]; // Restauramos la lista completa
  }
}