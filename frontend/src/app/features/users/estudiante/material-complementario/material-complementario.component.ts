import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
import { MessageService } from 'primeng/api'; // ✅ Recomendado para manejo de errores

// Servicios y Modelos unificados a NestJS
import { MaterialService } from '../../../../core/domains/academico/material-complementario/services/material-complementario.service';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';
import { Material } from '../../../../core/domains/academico/material-complementario/models/material.interface';

@Component({
  selector: 'app-estudiante-material-complementario',
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
  providers: [MessageService],
  templateUrl: './material-complementario.component.html',
  styleUrls: ['./material-complementario.component.css']
})
export class EstudianteMaterialcomplementarioComponent implements OnInit {
  
  private materialService = inject(MaterialService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  guias: Material[] = [];
  guiasFiltradas: Material[] = []; 
  loading: boolean = true;

  // --- FILTROS ---
  filtroTitulo: string = '';
  filtroFecha: Date | null = null;
  filtroArea: TipoMaterial | null = null;

  // Opciones sincronizadas con tu TipoMaterial (Enum)
  tiposMaterial = [
    { label: 'Técnico / Físico', value: TipoMaterial.FISICO },
    { label: 'Nutrición', value: TipoMaterial.NUTRICION },
    { label: 'Kinesiología', value: TipoMaterial.KINESIOLOGICO }
  ];

  ngOnInit() {
    this.cargarGuias();
  }

  cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    // ✅ Llamamos a la API de NestJS con límite alto para filtrar localmente
    this.materialService.listarMaterial({ limite: 100 }).subscribe({
      next: (response) => {
        this.guias = response.registros || [];
        this.guiasFiltradas = [...this.guias]; 
        this.aplicarFiltros(); // Asegura que se apliquen filtros preexistentes al recargar
        this.loading = false;
        this.cdr.detectChanges(); 
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las guías.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

  getNombreArea(valor: TipoMaterial): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}