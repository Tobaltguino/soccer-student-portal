import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

// 🚀 CAMBIO 1: Importamos el ContentService en lugar del SupabaseService
import { ContentService } from '../../../../core/services/content.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select'; 

@Component({
  selector: 'app-kine-view-guides',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    ButtonModule, 
    TooltipModule, 
    TableModule, 
    InputTextModule,
    DatePickerModule, 
    SelectModule      
  ],
  templateUrl: './kine-view-guides.html',
  styleUrls: ['./kine-view-guides.css']
})
export class KineViewGuidesComponent implements OnInit {
  
  guias: any[] = [];
  guiasOriginales: any[] = []; 
  loading: boolean = true;

  // --- FILTROS ---
  filtroTitulo: string = ''; 
  filtroFecha: Date | null = null;
  filtroArea: string | null = null;

  tiposMaterial = [
    { label: 'Técnico / Físico', value: 'TECNICO_FISICO' },
    { label: 'Nutrición', value: 'NUTRICION' },
    { label: 'Kinesiología', value: 'KINESIOLOGIA' }
  ];

  constructor(
    // 🚀 CAMBIO 2: Inyectamos el contentService
    private contentService: ContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGuias();
  }

  async cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      // 🚀 CAMBIO 3: Usamos el contentService
      const { data, error } = await this.contentService.getGuias();
      if (error) throw error;
      
      this.guiasOriginales = data || [];
      this.aplicarFiltros(); 
      
    } catch (error) {
      console.error('Error al cargar guías:', error);
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

  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}