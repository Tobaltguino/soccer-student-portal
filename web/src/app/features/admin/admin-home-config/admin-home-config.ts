import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select'; 
import { FileUploadModule } from 'primeng/fileupload';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-home-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, 
    TextareaModule, TabsModule, TableModule, DialogModule, ToastModule, 
    ConfirmDialogModule, SelectModule, FileUploadModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-home-config.html',
  styleUrls: ['./admin-home-config.css']
})
export class AdminHomeConfigComponent implements OnInit {

  loading = false;

  // Datos Generales
  config: any = {};

  // Listas
  metodologias: any[] = [];
  programas: any[] = [];
  alianzas: any[] = [];

  // Dialogos
  displayDialogMetodologia = false;
  displayDialogPrograma = false;
  displayDialogAlianza = false;

  // Formularios temporales
  itemForm: any = {};
  isEditing = false;

  // Variables para la imagen de alianza
  previewUrl: string | null = null;
  uploadingLogo = false;

  // Lista de iconos clásicos seguros
  listaIconos = [
    { label: 'Estrella Rellena', value: 'pi-star-fill' },
    { label: 'Estrella', value: 'pi-star' },
    { label: 'Corazón', value: 'pi-heart-fill' },
    { label: 'Monitor / Tecnología', value: 'pi-desktop' },
    { label: 'Rayo / Energía', value: 'pi-bolt' },
    { label: 'Direcciones / Táctica', value: 'pi-directions' },
    { label: 'Escudo / Defensa', value: 'pi-shield' },
    { label: 'Bolsa de Compras', value: 'pi-shopping-bag' },
    { label: 'Agua / Filtro', value: 'pi-filter' },
    { label: 'Nutrición / Manzana', value: 'pi-apple' },
    { label: 'Trofeo', value: 'pi-trophy' },
    { label: 'Bandera', value: 'pi-flag-fill' },
    { label: 'Usuarios / Equipo', value: 'pi-users' },
    { label: 'Mundo / Global', value: 'pi-globe' },
    { label: 'Check / Verificado', value: 'pi-check-circle' },
    { label: 'Sol / Brillo', value: 'pi-sun' },        
    { label: 'Premio / Marcador', value: 'pi-bookmark-fill' }, 
    { label: 'Salud / Más', value: 'pi-plus' }         
  ];

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.cargarTodo();
  }

  async cargarTodo() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const [conf, met, prog, ali] = await Promise.all([
        this.supabase.getConfiguracionWeb(),
        this.supabase.getWebMetodologias(),
        this.supabase.getWebProgramas(),
        this.supabase.getWebAlianzas()
      ]);

      this.config = conf.data || {};
      this.metodologias = met.data || [];
      this.programas = prog.data || [];
      this.alianzas = ali.data || [];
    } catch (e) {
      this.mostrarError('Error al cargar la información');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // --- GUARDAR CONFIGURACIÓN GENERAL ---
  async guardarConfigGeneral() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      await this.supabase.updateConfiguracionWeb(this.config);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración actualizada' });
    } catch (e) {
      this.mostrarError('No se pudo actualizar la configuración');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- MANEJO DE LISTAS (GENÉRICO) ---
  
  abrirNuevo(tipo: string) {
    this.isEditing = false;
    this.itemForm = { orden: 0 };
    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') {
        this.previewUrl = null;
        this.displayDialogAlianza = true;
    }
  }

  editarItem(tipo: string, item: any) {
    this.isEditing = true;
    this.itemForm = { ...item };
    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') {
        this.previewUrl = null; 
        this.displayDialogAlianza = true;
    }
  }

  cerrarModalAlianza() {
    this.displayDialogAlianza = false;
    this.previewUrl = null;
  }

  // --- SUBIDA DE IMAGEN (ALIANZAS) ---
  async onFileSelected(event: any) {
    const file: File = event.files[0];
    if (file) {
      this.uploadingLogo = true;
      
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrl = e.target.result;
      reader.readAsDataURL(file);

      // Usamos el nuevo bucket 'alianzas'
      const url = await this.supabase.subirFoto(file, 'alianzas'); 
      
      if (url) {
        this.itemForm.imagen_url = url;
        this.messageService.add({ severity: 'success', summary: 'Subida', detail: 'Imagen cargada correctamente' });
      } else {
        this.mostrarError('No se pudo subir la imagen.');
        this.previewUrl = null;
      }
      this.uploadingLogo = false;
      this.cdr.detectChanges();
    }
  }

  // --- GUARDADO DE TARJETAS ---

  async guardarMetodologia() {
    try {
      if (this.isEditing) await this.supabase.updateWebMetodologia(this.itemForm.id, this.itemForm);
      else await this.supabase.createWebMetodologia(this.itemForm);
      
      this.displayDialogMetodologia = false;
      this.cargarTodo(); 
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Metodología guardada' });
    } catch (e) { this.mostrarError('Error al guardar'); }
  }

  async guardarPrograma() {
    try {
      if (this.isEditing) await this.supabase.updateWebPrograma(this.itemForm.id, this.itemForm);
      else await this.supabase.createWebPrograma(this.itemForm);
      
      this.displayDialogPrograma = false;
      this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Programa guardado' });
    } catch (e) { this.mostrarError('Error al guardar'); }
  }

  async guardarAlianza() {
    try {
      this.loading = true;
      if (this.isEditing) await this.supabase.updateWebAlianza(this.itemForm.id, this.itemForm);
      else await this.supabase.createWebAlianza(this.itemForm);
      
      this.cerrarModalAlianza();
      this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Alianza guardada' });
    } catch (e) { 
      this.mostrarError('Error al guardar'); 
    } finally {
      this.loading = false;
    }
  }

  confirmarEliminar(tipo: string, id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar este elemento? Desaparecerá de la web pública.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          if (tipo === 'metodologia') await this.supabase.deleteWebMetodologia(id);
          if (tipo === 'programa') await this.supabase.deleteWebPrograma(id);
          if (tipo === 'alianza') await this.supabase.deleteWebAlianza(id);
          
          this.cargarTodo();
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Elemento eliminado correctamente' });
        } catch (e) {
          this.mostrarError('Error al eliminar');
        }
      }
    });
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}