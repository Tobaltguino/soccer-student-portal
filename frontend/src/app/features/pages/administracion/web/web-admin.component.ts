import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs'; // 🔥 IMPORTADO

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
  selector: 'app-web',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, 
    TextareaModule, TabsModule, TableModule, DialogModule, ToastModule, 
    ConfirmDialogModule, SelectModule, FileUploadModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './web.component.html',
  styleUrls: ['./web.component.scss']
})
export class WebComponent implements OnInit {

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

  async ngOnInit() {
    await this.cargarTodo();
  }

  async cargarTodo() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const [config, metodologias, programas, alianzas, auspiciadores] = await Promise.all([
        firstValueFrom(this.webConfigService.obtenerConfiguracion()),
        firstValueFrom(this.webMetodologiaService.listarMetodologias()),
        firstValueFrom(this.webProgramaService.listarProgramas()),
        firstValueFrom(this.webBeneficioService.listarBeneficios()),
        firstValueFrom(this.webAuspiciadorService.listarAuspiciadores())
      ]);

      this.config = config || {};
      this.metodologias = metodologias || [];
      this.programas = programas || [];
      this.alianzas = alianzas || [];
      this.auspiciadores = auspiciadores || [];

    } catch (error) {
      this.mostrarError('Error al cargar la información pública');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async guardarConfigGeneral() {
    if (this.guardando) return;
    this.guardando = true;
    this.cdr.detectChanges();

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
    
    try {
      await firstValueFrom(this.webConfigService.actualizarConfiguracion(payload));
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración actualizada' });
    } catch (err: any) {
      let errorDetalle = err.message || 'No se pudo actualizar la configuración';
      if (err.error?.message) {
        errorDetalle = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
      }
      this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail: errorDetalle, life: 6000 });
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
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
    
    if (item.imagenUrl || item.imagen_url) {
        this.previewUrl = item.imagenUrl || item.imagen_url;
    }

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

  async guardarMetodologia() {
    if (this.guardando) return;
    if (!this.itemForm.titulo) { this.mostrarError('El título es obligatorio'); return; }
    
    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      titulo: this.itemForm.titulo,
      descripcion: this.itemForm.descripcion,
      icono: this.itemForm.icono,
      orden: this.itemForm.orden
    };

    try {
      if (this.isEditing) {
        await firstValueFrom(this.webMetodologiaService.actualizarMetodologia(this.itemForm.id, payload));
      } else {
        await firstValueFrom(this.webMetodologiaService.crearMetodologia(payload));
      }
      this.cerrarModales();
      await this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Metodología guardada' });
    } catch (err: any) {
      let msg = err.message || 'Error al guardar';
      if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
      this.mostrarError(msg); 
    } finally {
      this.guardando = false; 
      this.cdr.detectChanges();
    }
  }

  async guardarPrograma() {
    if (this.guardando) return;
    if (!this.itemForm.titulo) { this.mostrarError('El título es obligatorio'); return; }
    
    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      titulo: this.itemForm.titulo,
      descripcion: this.itemForm.descripcion,
      icono: this.itemForm.icono,
      colorFondo: this.itemForm.colorFondo || this.itemForm.color_fondo,
      colorTexto: this.itemForm.colorTexto || this.itemForm.color_texto,
      orden: this.itemForm.orden
    };

    try {
      if (this.isEditing) {
        await firstValueFrom(this.webProgramaService.actualizarPrograma(this.itemForm.id, payload));
      } else {
        await firstValueFrom(this.webProgramaService.crearPrograma(payload));
      }
      this.cerrarModales();
      await this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Categoría guardada' });
    } catch (err: any) {
      let msg = err.message || 'Error al guardar';
      if (err.error?.message) msg = Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
      this.mostrarError(msg); 
    } finally {
      this.guardando = false; 
      this.cdr.detectChanges();
    }
  }

  async guardarAlianza() {
    if (this.guardando) return;
    if (!this.itemForm.nombre) { this.mostrarError('El nombre de la marca es obligatorio'); return; }

    this.guardando = true;
    this.cdr.detectChanges();
    
    const file = this.archivoSeleccionado || undefined;

    try {
      if (this.isEditing) {
        await firstValueFrom(this.webBeneficioService.actualizarBeneficio(this.itemForm.id, this.itemForm, file));
      } else {
        await firstValueFrom(this.webBeneficioService.crearBeneficio(this.itemForm, file));
      }
      this.cerrarModales();
      await this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Alianza guardada' });
    } catch (error) {
      this.mostrarError('Error al guardar la alianza');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  async guardarAuspiciador() {
    if (this.guardando) return;
    if (!this.itemForm.nombre) { this.mostrarError('El nombre del auspiciador es obligatorio'); return; }

    this.guardando = true;
    this.cdr.detectChanges();
    
    const file = this.archivoSeleccionado || undefined;

    try {
      if (this.isEditing) {
        await firstValueFrom(this.webAuspiciadorService.actualizarAuspiciador(this.itemForm.id, this.itemForm, file));
      } else {
        await firstValueFrom(this.webAuspiciadorService.crearAuspiciador(this.itemForm, file));
      }
      this.cerrarModales();
      await this.cargarTodo();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Auspiciador guardado' });
    } catch (error) {
      this.mostrarError('Error al guardar el auspiciador');
    } finally {
      this.guardando = false;
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
        this.loading = true;
        this.cdr.detectChanges();

        try {
          if (tipo === 'metodologia') await firstValueFrom(this.webMetodologiaService.eliminarMetodologia(id));
          if (tipo === 'programa') await firstValueFrom(this.webProgramaService.eliminarPrograma(id));
          if (tipo === 'alianza') await firstValueFrom(this.webBeneficioService.eliminarBeneficio(id));
          if (tipo === 'auspiciador') await firstValueFrom(this.webAuspiciadorService.eliminarAuspiciador(id));

          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Elemento eliminado correctamente' });
          await this.cargarTodo();
        } catch (error) {
          this.mostrarError('Error al eliminar el elemento');
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}