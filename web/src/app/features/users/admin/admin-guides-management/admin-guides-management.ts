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
import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../../core/services/supabase.service'; 

@Component({
  selector: 'app-admin-guides-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-guides-management.html',
  styleUrls: ['./admin-guides-management.css']
})
export class AdminGuidesManagementComponent implements OnInit {
  guias: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  // Agregamos 'id' para saber si estamos editando
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

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
    this.nuevaGuia = { id: null, titulo: '', descripcion: '', archivo_url: '' };
    this.archivoSeleccionado = null;
    this.displayDialog = true;
  }

  // ✅ NUEVA FUNCIÓN PARA EDITAR
  editarGuia(guia: any) {
    this.nuevaGuia = { ...guia }; // Copiamos los datos al formulario
    this.archivoSeleccionado = null; // Reseteamos el archivo físico
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
    if (!this.nuevaGuia.titulo || (!this.nuevaGuia.id && !this.archivoSeleccionado)) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título y asegurarse de tener un archivo adjunto.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    try {
      let urlFinal = this.nuevaGuia.archivo_url;
      let archivoViejoParaBorrar = null; 

      // 1. Si el profe seleccionó un NUEVO archivo, lo subimos
      if (this.archivoSeleccionado) {
        
        // Si estamos editando y ya había una URL, la guardamos para borrarla al final
        if (this.nuevaGuia.id && this.nuevaGuia.archivo_url) {
          archivoViejoParaBorrar = this.nuevaGuia.archivo_url;
        }
        
        urlFinal = await this.supabase.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      }
      
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        archivo_url: urlFinal
      };

      // 2. ¿Creamos o Actualizamos en la Base de Datos?
      if (this.nuevaGuia.id) {
        const { error } = await this.supabase.updateGuia(this.nuevaGuia.id, guiaParaBD);
        if (error) throw error;
        
        // ✅ 3. LA MAGIA: Si todo se actualizó bien en la BD y hay un archivo viejo, lo borramos
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
}