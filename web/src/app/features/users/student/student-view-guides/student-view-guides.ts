import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

// PrimeNG
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select';

// 🚀 CAMBIO 1: Importamos el ContentService (Adiós SupabaseService)
import { ContentService } from '../../../../core/services/content.service';

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
    DatePickerModule,
    SelectModule 
  ],
  templateUrl: './student-view-guides.html',
  styleUrls: ['./student-view-guides.css']
})
export class StudentViewGuidesComponent implements OnInit {
  guias: any[] = [];
  guiasFiltradas: any[] = []; 
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
    // 🚀 CAMBIO 2: Inyectamos nuestro servicio de contenido
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
      // 🚀 CAMBIO 3: Usamos ContentService para traer el material educativo
      const { data, error } = await this.contentService.getGuias();
      if (error) throw error;
      
      this.guias = data || [];
      this.guiasFiltradas = [...this.guias]; 
      
    } catch (error) {
      console.error('Error al cargar guías para el alumno:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // --- LÓGICA DE FILTRADO MÚLTIPLE ---
  aplicarFiltros() {
    this.guiasFiltradas = this.guias.filter(guia => {
      // 1. Filtrar por Título
      const coincideTitulo = (guia.titulo || '').toLowerCase().includes(this.filtroTitulo.toLowerCase());
      
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
    this.guiasFiltradas = [...this.guias]; 
    this.cdr.detectChanges();
  }

  // ✅ Helper visual para mostrar el nombre del área en la tabla
  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}