import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

// PrimeNG
import { TooltipModule } from 'primeng/tooltip';
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

// Nuevos Servicios Web de Dominio
import { WebConfiguracionService } from '../../../../core/domains/administracion/web/web-configuracion/services/web-configuracion.service';
import { WebMetodologiaService } from '../../../../core/domains/administracion/web/web-metodologias/services/web-metodologia.sevice';
import { WebProgramaService } from '../../../../core/domains/administracion/web/web-programas/services/web-programa.service';
import { WebBeneficioService } from '../../../../core/domains/administracion/web/web-beneficios/services/web-beneficio.service';
import { WebAuspiciadorService } from '../../../../core/domains/administracion/web/web-auspiciadores/services/web-auspiciador.service';

@Component({
  selector: 'app-administrador-configuracion-inicio',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, 
    TextareaModule, TabsModule, TableModule, DialogModule, ToastModule, 
    ConfirmDialogModule, SelectModule, FileUploadModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './configuracion-inicio.component.html',
  styleUrls: ['./configuracion-inicio.component.scss']
})
export class AdminHomeConfigComponent implements OnInit {

  private webConfigService = inject(WebConfiguracionService);
  private webMetodologiaService = inject(WebMetodologiaService);
  private webProgramaService = inject(WebProgramaService);
  private webBeneficioService = inject(WebBeneficioService); // Alianzas
  private webAuspiciadorService = inject(WebAuspiciadorService);

  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  saving = false;

  // Datos Generales
  config: any = {};

  // Listas
  metodologias: any[] = [];
  programas: any[] = [];
  alianzas: any[] = [];
  auspiciadores: any[] = []; 

  // Dialogos
  displayDialogMetodologia = false;
  displayDialogPrograma = false;
  displayDialogAlianza = false;
  displayDialogAuspiciador = false; 

  // Formularios temporales
  itemForm: any = {};
  isEditing = false;

  // Variables para imágenes (AHORA SE GUARDAN PARA ENVIAR CON EL FORMULARIO)
  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;

  // Lista de iconos
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

  ngOnInit() {
    this.cargarTodo();
  }

  cargarTodo() {
    this.loading = true;
    this.cdr.detectChanges(); 

    forkJoin({
      config: this.webConfigService.obtenerConfiguracion(),
      metodologias: this.webMetodologiaService.listarMetodologias(),
      programas: this.webProgramaService.listarProgramas(),
      alianzas: this.webBeneficioService.listarBeneficios(),
      auspiciadores: this.webAuspiciadorService.listarAuspiciadores()
    }).subscribe({
      next: (data) => {
        this.config = data.config || {};
        this.metodologias = data.metodologias || [];
        this.programas = data.programas || [];
        this.alianzas = data.alianzas || [];
        this.auspiciadores = data.auspiciadores || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar la información pública');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- GUARDAR CONFIGURACIÓN GENERAL ---
  guardarConfigGeneral() {
    this.loading = true;
    this.webConfigService.actualizarConfiguracion(this.config).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración actualizada' });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('No se pudo actualizar la configuración');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- MANEJO DE LISTAS Y MODALES ---
  abrirNuevo(tipo: string) {
    this.isEditing = false;
    this.itemForm = { orden: 0 };
    this.limpiarImagen();
    
    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') this.displayDialogAlianza = true;
    if (tipo === 'auspiciador') this.displayDialogAuspiciador = true;
  }

  editarItem(tipo: string, item: any) {
    this.isEditing = true;
    this.itemForm = { ...item };
    this.limpiarImagen();
    
    // Si editamos un item con imagen, la previsualizamos
    if (item.imagenUrl) this.previewUrl = item.imagenUrl;
    // Si viene de Supabase (Legacy), quizás se llame imagen_url
    if (item.imagen_url) this.previewUrl = item.imagen_url;

    if (tipo === 'metodologia') this.displayDialogMetodologia = true;
    if (tipo === 'programa') this.displayDialogPrograma = true;
    if (tipo === 'alianza') this.displayDialogAlianza = true;
    if (tipo === 'auspiciador') this.displayDialogAuspiciador = true;
  }

  cerrarModales() {
    this.displayDialogMetodologia = false;
    this.displayDialogPrograma = false;
    this.displayDialogAlianza = false;
    this.displayDialogAuspiciador = false;
    this.limpiarImagen();
  }

  // --- SUBIDA DE IMAGEN (Adaptada a NestJS FormData) ---
  onFileSelected(event: any) {
    const file: File = event.files[0];
    if (file) {
      this.archivoSeleccionado = file; // Lo guardamos para enviarlo al hacer clic en "Guardar"
      
      // Mostramos preview inmediato
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrl = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  limpiarImagen() {
    this.archivoSeleccionado = null;
    this.previewUrl = null;
  }

  // --- GUARDADO DE METODOLOGIAS ---
  guardarMetodologia() {
    this.saving = true;
    const obs$ = this.isEditing 
      ? this.webMetodologiaService.actualizarMetodologia(this.itemForm.id, this.itemForm)
      : this.webMetodologiaService.crearMetodologia(this.itemForm);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Metodología guardada' });
        this.saving = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.saving = false; }
    });
  }

  // --- GUARDADO DE PROGRAMAS (CATEGORÍAS) ---
  guardarPrograma() {
    this.saving = true;
    const obs$ = this.isEditing 
      ? this.webProgramaService.actualizarPrograma(this.itemForm.id, this.itemForm)
      : this.webProgramaService.crearPrograma(this.itemForm);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Categoría guardada' });
        this.saving = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.saving = false; }
    });
  }

  // --- GUARDADO DE ALIANZAS (BENEFICIOS) ---
  guardarAlianza() {
    this.saving = true;
    // Si hay un archivoSeleccionado, lo pasamos al servicio para que arme el FormData
    const file = this.archivoSeleccionado || undefined;

    const obs$ = this.isEditing 
      ? this.webBeneficioService.actualizarBeneficio(this.itemForm.id, this.itemForm, file)
      : this.webBeneficioService.crearBeneficio(this.itemForm, file);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Alianza guardada' });
        this.saving = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.saving = false; }
    });
  }

  // --- GUARDADO DE AUSPICIADORES ---
  guardarAuspiciador() {
    this.saving = true;
    const file = this.archivoSeleccionado || undefined;

    const obs$ = this.isEditing 
      ? this.webAuspiciadorService.actualizarAuspiciador(this.itemForm.id, this.itemForm, file)
      : this.webAuspiciadorService.crearAuspiciador(this.itemForm, file);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Auspiciador guardado' });
        this.saving = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.saving = false; }
    });
  }

  // --- ELIMINAR ELEMENTOS ---
  confirmarEliminar(tipo: string, id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar este elemento? Desaparecerá de la web pública.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        let obs$;
        if (tipo === 'metodologia') obs$ = this.webMetodologiaService.eliminarMetodologia(id);
        if (tipo === 'programa') obs$ = this.webProgramaService.eliminarPrograma(id);
        if (tipo === 'alianza') obs$ = this.webBeneficioService.eliminarBeneficio(id);
        if (tipo === 'auspiciador') obs$ = this.webAuspiciadorService.eliminarAuspiciador(id);

        if (obs$) {
          obs$.subscribe({
            next: () => {
              this.cargarTodo();
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Elemento eliminado correctamente' });
            },
            error: () => this.mostrarError('Error al eliminar')
          });
        }
      }
    });
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}