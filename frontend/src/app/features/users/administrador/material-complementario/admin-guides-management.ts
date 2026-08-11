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
import { SelectModule } from 'primeng/select'; // ✅ Agregado para el Dropdown
import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../../../core/services/supabase.service'; 

@Component({
  selector: 'app-admin-guides-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SelectModule // ✅ Asegúrate de importarlo aquí
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-guides-management.html',
  styleUrls: ['./admin-guides-management.css']
})
export class AdminGuidesManagementComponent implements OnInit {
  guias: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  // ✅ Formulario inicializado con el campo 'tipo_material'
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  // ✅ Opciones exactas para la base de datos
  tiposMaterial = [
    { label: 'Técnico / Físico', value: 'TECNICO_FISICO' },
    { label: 'Nutrición', value: 'NUTRICION' },
    { label: 'Kinesiología', value: 'KINESIOLOGIA' }
  ];

  constructor(
    private supabase: SupabaseService,
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
      const guiasRes = await this.supabase.getGuias();
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
    // ✅ Validación actualizada: ahora exige tipo_material
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
        urlFinal = await this.supabase.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      }
      
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipo_material: this.nuevaGuia.tipo_material, // ✅ Guardamos el tipo de material
        archivo_url: urlFinal
      };

      if (this.nuevaGuia.id) {
        const { error } = await this.supabase.updateGuia(this.nuevaGuia.id, guiaParaBD);
        if (error) throw error;
        
        if (archivoViejoParaBorrar) {
          await this.supabase.deleteGuiaFile(archivoViejoParaBorrar);
        }

        this.messageService.add({ severity: 'success', summary: 'Actualizada', detail: 'La guía se modificó correctamente.' });
      } else {
        const { error } = await this.supabase.createGuia(guiaParaBD);
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
          const { error } = await this.supabase.deleteGuia(id);
          if (error) throw error;
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Guía borrada exitosamente.' });
          this.cargarDatos();
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la guía.' });
        }
      }
    });
  }

  // ✅ Helper visual para mostrar el nombre del área en la tabla
  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}