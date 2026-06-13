import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select'; 
import { MessageService, ConfirmationService } from 'primeng/api';

// 🚀 CAMBIO 1: Importamos los servicios especializados
import { ContentService } from '../../../../shared/services/content.service';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-admin-guides-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SelectModule 
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-guides-management.html',
  styleUrls: ['./admin-guides-management.css']
})
export class AdminGuidesManagementComponent implements OnInit {
  guias: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  tiposMaterial = [
    { label: 'Técnico / Físico', value: 'TECNICO_FISICO' },
    { label: 'Nutrición', value: 'NUTRICION' },
    { label: 'Kinesiología', value: 'KINESIOLOGIA' }
  ];

  constructor(
    // 🚀 CAMBIO 2: Inyectamos Content y Storage
    private contentService: ContentService,
    private storageService: StorageService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.loading = true;
    try {
      // 🚀 CAMBIO 3: Usamos contentService
      const guiasRes = await this.contentService.getGuias();
      this.guias = guiasRes.data || [];
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las guías.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  abrirNuevo() {
    this.nuevaGuia = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
    this.archivoSeleccionado = null;
    this.displayDialog = true;
  }

  editarGuia(guia: any) {
    this.nuevaGuia = { ...guia }; 
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
    if (!this.nuevaGuia.titulo || !this.nuevaGuia.tipo_material || (!this.nuevaGuia.id && !this.archivoSeleccionado)) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título, seleccionar el área y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    try {
      let urlFinal = this.nuevaGuia.archivo_url;
      let archivoViejoParaBorrar = null; 

      if (this.archivoSeleccionado) {
        if (this.nuevaGuia.id && this.nuevaGuia.archivo_url) {
          archivoViejoParaBorrar = this.nuevaGuia.archivo_url;
        }
        // 🚀 CAMBIO 4: El archivo se sube vía storageService
        urlFinal = await this.storageService.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      }
      
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipo_material: this.nuevaGuia.tipo_material, 
        archivo_url: urlFinal
      };

      if (this.nuevaGuia.id) {
        // 🚀 CAMBIO 5: Actualización vía contentService
        const { error } = await this.contentService.updateGuia(this.nuevaGuia.id, guiaParaBD);
        if (error) throw error;
        
        if (archivoViejoParaBorrar) {
          // 🚀 CAMBIO 6: Borrado físico vía storageService
          await this.storageService.deleteGuiaFile(archivoViejoParaBorrar);
        }

        this.messageService.add({ severity: 'success', summary: 'Actualizada', detail: 'La guía se modificó correctamente.' });
      } else {
        // 🚀 CAMBIO 7: Creación vía contentService
        const { error } = await this.contentService.createGuia(guiaParaBD);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Publicada', detail: 'La guía se subió correctamente.' });
      }

      this.displayDialog = false;
      this.cargarDatos();

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error al guardar', detail: error.message || 'Hubo un problema al procesar la guía.' });
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }

  eliminarGuia(id: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta guía? Desaparecerá para todos los usuarios.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          // 🚀 CAMBIO 8: Eliminación vía contentService
          const { error } = await this.contentService.deleteGuia(id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Guía borrada exitosamente.' });
          this.cargarDatos();
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la guía.' });
        }
      }
    });
  }

  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}