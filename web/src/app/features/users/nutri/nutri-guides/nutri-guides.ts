import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// 🚀 Servicios de dominio
import { ContentService } from '../../../../core/services/content.service';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-nutri-guides',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TableModule, 
    ButtonModule, 
    DialogModule, 
    InputTextModule, 
    ToastModule, 
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './nutri-guides.html',
  styleUrls: ['./nutri-guides.css']
})
export class NutriGuidesComponent implements OnInit {
  guias: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  // Modelo limpio, solo para crear
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
    this.cargarDatos();
  }

  async cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      // Usamos ContentService y filtramos estrictamente por NUTRICION
      const { data, error } = await this.contentService.getGuias(); 
      if (error) throw error;

      this.guias = (data || []).filter((g: any) => g.tipo_material === 'NUTRICION');
      
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los documentos.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

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
      // ✅ AHORA SÍ: Usamos el método correcto de tu StorageService
      const urlFinal = await this.storageService.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      
      // Armamos el objeto forzando la categoría (Sello de seguridad)
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        archivo_url: urlFinal,
        tipo_material: 'NUTRICION' // 🔒 Esta etiqueta categoriza el material automáticamente
      };

      // Usamos ContentService para crear el registro
      const { error } = await this.contentService.createGuia(guiaParaBD);
      if (error) throw error;
      
      this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'El material se subió correctamente.' });
      
      this.displayDialog = false;
      this.cargarDatos();

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error al subir', detail: error.message || 'Hubo un problema al procesar el archivo.' });
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }
}