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
import { InputNumberModule } from 'primeng/inputnumber'; 

import { InicioService } from '../../../../core/services/modulos/administracion/inicio.service';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-admin-home-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, 
    TextareaModule, TabsModule, TableModule, DialogModule, ToastModule, 
    ConfirmDialogModule, SelectModule, FileUploadModule, InputNumberModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-home-config.html',
  styleUrls: ['./admin-home-config.css']
})
export class AdminHomeConfigComponent implements OnInit {

  loading = false;
  config: any = {};

  // Listas ordenadas
  metodologias: any[] = [];
  programas: any[] = [];
  alianzas: any[] = [];
  auspiciadores: any[] = [];

  // Diálogos
  displayDialogMetodologia = false;
  displayDialogPrograma = false;
  displayDialogAlianza = false;
  displayDialogAuspiciador = false;

  itemForm: any = {};
  isEditing = false;
  previewUrl: string | null = null;
  uploadingLogo = false;

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
    private inicioService: InicioService,
    private storageService: StorageService,
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
      const [conf, met, prog, ali, aus] = await Promise.all([
        this.inicioService.getConfiguracionWeb(),
        this.inicioService.getWebMetodologias(),
        this.inicioService.getWebProgramas(),
        this.inicioService.getWebAlianzas(),
        this.inicioService.getWebAuspiciadores()
      ]);

      this.config = conf.data || {};
      this.metodologias = met.data || [];
      this.programas = prog.data || [];
      this.alianzas = ali.data || [];
      this.auspiciadores = aus.data || [];
    } catch (e) {
      this.mostrarError('Error al cargar la información');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  async guardarConfigGeneral() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      await this.inicioService.updateConfiguracionWeb(this.config);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración actualizada' });
    } catch (e) {
      this.mostrarError('No se pudo actualizar la configuración');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- LÓGICA DE ORDEN AUTOMÁTICO ---
  private calcularSiguienteOrden(lista: any[]): number {
    if (!lista || lista.length === 0) return 1;
    const max = Math.max(...lista.map(item => item.orden || 0));
    return max + 1;
  }

  // --- MANEJO DE LISTAS ---
  
  abrirNuevo(tipo: string) {
    this.isEditing = false;
    this.previewUrl = null;
    
    // Sugerimos automáticamente el siguiente número de orden
    let ordenBase = 1;
    if (tipo === 'metodologia') ordenBase = this.calcularSiguienteOrden(this.metodologias);
    if (tipo === 'programa') ordenBase = this.calcularSiguienteOrden(this.programas);
    if (tipo === 'alianza') ordenBase = this.calcularSiguienteOrden(this.alianzas);
    if (tipo === 'auspiciador') ordenBase = this.calcularSiguienteOrden(this.auspiciadores);

    this.itemForm = { orden: ordenBase };

    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') this.displayDialogAlianza = true;
    if (tipo === 'auspiciador') this.displayDialogAuspiciador = true;
  }

  editarItem(tipo: string, item: any) {
    this.isEditing = true;
    this.itemForm = { ...item };
    this.previewUrl = null; 

    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') this.displayDialogAlianza = true;
    if (tipo === 'auspiciador') this.displayDialogAuspiciador = true;
  }

  cerrarModalAlianza() {
    this.displayDialogAlianza = false;
    this.previewUrl = null;
  }

  cerrarModalAuspiciador() {
    this.displayDialogAuspiciador = false;
    this.previewUrl = null;
  }

  // --- SUBIDA DE IMAGEN ---
  async onFileSelected(event: any, bucket: string = 'alianzas') {
    const file: File = event.files[0];
    if (file) {
      this.uploadingLogo = true;
      
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrl = e.target.result;
      reader.readAsDataURL(file);

      const url = await this.storageService.subirFoto(file, bucket); 
      
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

  // --- GUARDADO GENÉRICO DE TARJETAS ---

  async guardarItem(tipo: string) {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      if (tipo === 'metodologia') {
        if (this.isEditing) await this.inicioService.updateWebMetodologia(this.itemForm.id, this.itemForm);
        else await this.inicioService.createWebMetodologia(this.itemForm);
        this.displayDialogMetodologia = false;
      }
      else if (tipo === 'programa') {
        if (this.isEditing) await this.inicioService.updateWebPrograma(this.itemForm.id, this.itemForm);
        else await this.inicioService.createWebPrograma(this.itemForm);
        this.displayDialogPrograma = false;
      }
      else if (tipo === 'alianza') {
        if (this.isEditing) await this.inicioService.updateWebAlianza(this.itemForm.id, this.itemForm);
        else await this.inicioService.createWebAlianza(this.itemForm);
        this.cerrarModalAlianza();
      }
      else if (tipo === 'auspiciador') {
        if (this.isEditing) await this.inicioService.updateWebAuspiciador(this.itemForm.id, this.itemForm);
        else await this.inicioService.createWebAuspiciador(this.itemForm);
        this.cerrarModalAuspiciador();
      }

      this.cargarTodo(); 
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Elemento guardado correctamente' });
    } catch (e) { 
      this.mostrarError('Error al guardar'); 
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
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
          if (tipo === 'metodologia') await this.inicioService.deleteWebMetodologia(id);
          if (tipo === 'programa') await this.inicioService.deleteWebPrograma(id);
          if (tipo === 'alianza') await this.inicioService.deleteWebAlianza(id);
          if (tipo === 'auspiciador') await this.inicioService.deleteWebAuspiciador(id); 
          
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