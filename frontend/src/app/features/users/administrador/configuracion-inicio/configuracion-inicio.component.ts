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

// Servicios
import { WebConfiguracionService } from '../../../../core/domains/administracion/web/web-configuracion/services/web-configuracion.service';
import { WebMetodologiaService } from '../../../../core/domains/administracion/web/web-metodologias/services/web-metodologia.service';
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
  private webBeneficioService = inject(WebBeneficioService); 
  private webAuspiciadorService = inject(WebAuspiciadorService);

  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  guardando = false;

  config: any = {};
  metodologias: any[] = [];
  programas: any[] = [];
  alianzas: any[] = [];
  auspiciadores: any[] = []; 

  displayDialogMetodologia = false;
  displayDialogPrograma = false;
  displayDialogAlianza = false;
  displayDialogAuspiciador = false; 

  itemForm: any = {};
  isEditing = false;
  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;

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

  guardarConfigGeneral() {
    if (this.guardando) return;
    this.guardando = true;

    // Ya no necesitamos buscar el snake_case, solo enviamos el objeto purgado del ID
    const payload = {
      telefono: this.config.telefono,
      correo: this.config.correo,
      instagramNombre: this.config.instagramNombre,
      instagramUrl: this.config.instagramUrl,
      facebookNombre: this.config.facebookNombre,
      facebookUrl: this.config.facebookUrl,
      whatsappMensaje: this.config.whatsappMensaje,
      heroTitulo: this.config.heroTitulo,
      heroSubtitulo: this.config.heroSubtitulo,
    };
    
    this.webConfigService.actualizarConfiguracion(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración actualizada' });
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        let errorDetalle = 'No se pudo actualizar la configuración';
        if (err.error?.message) {
          errorDetalle = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
        }
        this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail: errorDetalle, life: 6000 });
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

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
    
    // Adiós al item.imagen_url
    if (item.imagenUrl) this.previewUrl = item.imagenUrl;

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

  onFileSelected(event: any) {
    const file: File = event.files[0];
    if (file) {
      this.archivoSeleccionado = file; 
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrl = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  limpiarImagen() {
    this.archivoSeleccionado = null;
    this.previewUrl = null;
  }

  guardarMetodologia() {
    if (this.guardando) return;
    if (!this.itemForm.titulo) { this.mostrarError('El título es obligatorio'); return; }
    this.guardando = true;

    const payload = {
      titulo: this.itemForm.titulo,
      descripcion: this.itemForm.descripcion,
      icono: this.itemForm.icono,
      orden: this.itemForm.orden
    };

    const obs$ = this.isEditing 
      ? this.webMetodologiaService.actualizarMetodologia(this.itemForm.id, payload)
      : this.webMetodologiaService.crearMetodologia(payload);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Metodología guardada' });
        this.guardando = false;
      },
      error: (err) => { 
        let msg = 'Error al guardar';
        if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
        this.mostrarError(msg); 
        this.guardando = false; 
      }
    });
  }

  guardarPrograma() {
    if (this.guardando) return;
    if (!this.itemForm.titulo) { this.mostrarError('El título es obligatorio'); return; }
    this.guardando = true;

    const payload = {
      titulo: this.itemForm.titulo,
      descripcion: this.itemForm.descripcion,
      icono: this.itemForm.icono,
      colorFondo: this.itemForm.colorFondo,
      colorTexto: this.itemForm.colorTexto,
      orden: this.itemForm.orden
    };

    const obs$ = this.isEditing 
      ? this.webProgramaService.actualizarPrograma(this.itemForm.id, payload)
      : this.webProgramaService.crearPrograma(payload);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Categoría guardada' });
        this.guardando = false;
      },
      error: (err) => { 
        let msg = 'Error al guardar';
        if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
        this.mostrarError(msg); 
        this.guardando = false; 
      }
    });
  }

  guardarAlianza() {
    if (this.guardando) return;
    if (!this.itemForm.nombre) { this.mostrarError('El nombre de la marca es obligatorio'); return; }

    this.guardando = true;
    const file = this.archivoSeleccionado || undefined;

    const obs$ = this.isEditing 
      ? this.webBeneficioService.actualizarBeneficio(this.itemForm.id, this.itemForm, file)
      : this.webBeneficioService.crearBeneficio(this.itemForm, file);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Alianza guardada' });
        this.guardando = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.guardando = false; }
    });
  }

  guardarAuspiciador() {
    if (this.guardando) return;
    if (!this.itemForm.nombre) { this.mostrarError('El nombre del auspiciador es obligatorio'); return; }

    this.guardando = true;
    const file = this.archivoSeleccionado || undefined;

    const obs$ = this.isEditing 
      ? this.webAuspiciadorService.actualizarAuspiciador(this.itemForm.id, this.itemForm, file)
      : this.webAuspiciadorService.crearAuspiciador(this.itemForm, file);

    obs$.subscribe({
      next: () => {
        this.cerrarModales();
        this.cargarTodo();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Auspiciador guardado' });
        this.guardando = false;
      },
      error: () => { this.mostrarError('Error al guardar'); this.guardando = false; }
    });
  }

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