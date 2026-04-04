import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

// Servicios
import { ContentService } from '../../../../core/services/content.service';
import { StorageService } from '../../../../core/services/storage.service';
import { MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select'; 
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';

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
    SelectModule,
    ToastModule,
    DialogModule
  ],
  providers: [MessageService],
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

  // --- SUBIDA DE MATERIAL ---
  displayDialog: boolean = false;
  nuevaGuia: any = { titulo: '', descripcion: '', archivo_url: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  constructor(
    private contentService: ContentService,
    private storageService: StorageService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGuias();
  }

  async cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.contentService.getGuias();
      if (error) throw error;
      
      this.guiasOriginales = data || [];
      this.aplicarFiltros(); 
      
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los documentos.' });
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

  // --- LÓGICA PARA CREAR MATERIAL ---
  abrirNuevo() {
    this.nuevaGuia = { titulo: '', descripcion: '', archivo_url: '' };
    this.archivoSeleccionado = null;
    this.displayDialog = true;
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.messageService.add({ severity: 'warn', summary: 'Archivo muy grande', detail: 'El archivo no debe superar los 5MB' });
        event.target.value = '';
        return;
      }
      this.archivoSeleccionado = file;
    }
  }

  async guardarGuia() {
    if (!this.nuevaGuia.titulo || !this.archivoSeleccionado) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    try {
      const urlFinal = await this.storageService.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        archivo_url: urlFinal,
        tipo_material: 'KINESIOLOGIA' // 🔒 Se guarda automáticamente como Kinesiología
      };

      const { error } = await this.contentService.createGuia(guiaParaBD);
      if (error) throw error;
      
      this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'El material se subió correctamente.' });
      
      this.displayDialog = false;
      this.cargarGuias(); // Recargamos la tabla principal

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error al subir', detail: error.message || 'Hubo un problema al procesar el archivo.' });
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }
}