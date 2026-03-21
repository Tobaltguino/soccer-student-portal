import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

import { SupabaseService } from '../../../../core/services/supabase.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; 
import { DatePickerModule } from 'primeng/datepicker'; // ✅ Nuevo
import { SelectModule } from 'primeng/select'; // ✅ Nuevo

@Component({
  selector: 'app-professor-view-guides',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    ButtonModule, 
    TooltipModule, 
    TableModule, 
    InputTextModule,
    DatePickerModule, // ✅ Añadido
    SelectModule      // ✅ Añadido
  ],
  templateUrl: './professor-view-guides.html',
  styleUrls: ['./professor-view-guides.css']
})
export class ProfessorViewGuidesComponent implements OnInit {
  
  guias: any[] = [];
  guiasOriginales: any[] = []; 
  loading: boolean = true;

  // --- FILTROS ---
  filtroTitulo: string = ''; 
  filtroFecha: Date | null = null;
  filtroArea: string | null = null;

  // ✅ Opciones exactas para la base de datos
  tiposMaterial = [
    { label: 'Técnico / Físico', value: 'TECNICO_FISICO' },
    { label: 'Nutrición', value: 'NUTRICION' },
    { label: 'Kinesiología', value: 'KINESIOLOGIA' }
  ];

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
      
      this.guiasOriginales = data || [];
      this.aplicarFiltros(); 
      
    } catch (error) {
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // --- LÓGICA DE FILTRADO MÚLTIPLE ---
  aplicarFiltros() {
    this.guias = this.guiasOriginales.filter(guia => {
      // 1. Filtrar por Título
      const coincideTitulo = (guia.titulo || '').toLowerCase().includes(this.filtroTitulo.toLowerCase().trim());
      
      // 2. Filtrar por Fecha
      let coincideFecha = true;
      if (this.filtroFecha) {
        const fechaGuia = new Date(guia.created_at);
        const fechaFiltro = new Date(this.filtroFecha);
        
        coincideFecha = fechaGuia.getFullYear() === fechaFiltro.getFullYear() &&
                        fechaGuia.getMonth() === fechaFiltro.getMonth() &&
                        fechaGuia.getDate() === fechaFiltro.getDate();
      }

      // 3. Filtrar por Área (tipo_material)
      let coincideArea = true;
      if (this.filtroArea) {
        coincideArea = guia.tipo_material === this.filtroArea;
      }

      return coincideTitulo && coincideFecha && coincideArea;
    });

    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroTitulo = '';
    this.filtroFecha = null;
    this.filtroArea = null;
    this.aplicarFiltros(); 
  }

  // ✅ Helper visual para mostrar el nombre del área en la tabla
  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}