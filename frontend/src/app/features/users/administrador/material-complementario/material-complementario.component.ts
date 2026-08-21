import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
import { TextareaModule } from 'primeng/textarea';

// Servicios y Modelos unificados a NestJS
import { MaterialService } from '../../../../core/domains/academico/material-complementario/services/material-complementario.service';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';
import { Material, CrearMaterialPayload, ActualizarMaterialPayload } from '../../../../core/domains/academico/material-complementario/models/material.interface';

@Component({
  selector: 'app-administrador-material-complementario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SelectModule, TextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './material-complementario.component.html',
  styleUrls: ['./material-complementario.component.scss']
})
export class AdministradorMaterialComplementarioComponent implements OnInit {
  
  private materialService = inject(MaterialService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  guias: Material[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  tiposMaterial = [
    { label: 'Técnico / Físico', value: TipoMaterial.FISICO },
    { label: 'Nutrición', value: TipoMaterial.NUTRICION },
    { label: 'Kinesiología', value: TipoMaterial.KINESIOLOGICO }
  ];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    
    // Llamamos a la API de NestJS con límite alto (o sin límite si tu backend lo permite)
    this.materialService.listarMaterial({ limite: 100 }).subscribe({
      next: (response) => {
        this.guias = response.registros;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las guías.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirNuevo() {
    this.nuevaGuia = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
    this.archivoSeleccionado = null;
    this.displayDialog = true;
  }

  editarGuia(guia: Material) {
    this.nuevaGuia = { ...guia }; 
    this.archivoSeleccionado = null; 
    this.displayDialog = true;
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // Actualizado a 20MB para coincidir con backend
        this.messageService.add({ severity: 'warn', summary: 'Archivo muy grande', detail: 'El archivo no debe superar los 20MB' });
        event.target.value = '';
        return;
      }
      this.archivoSeleccionado = file;
    }
  }

  guardarGuia() {
    if (!this.nuevaGuia.titulo || !this.nuevaGuia.tipo_material || (!this.nuevaGuia.id && !this.archivoSeleccionado)) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título, seleccionar el área y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    if (this.nuevaGuia.id) {
      // ACTUALIZAR (Solo metadatos)
      const payload: ActualizarMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipoMaterial: this.nuevaGuia.tipo_material
      };

      this.materialService.actualizarMaterial(this.nuevaGuia.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Actualizada', detail: 'La guía se modificó correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err)
      });
    } else {
      // CREAR NUEVO (Incluye Archivo)
      const payload: CrearMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipoMaterial: this.nuevaGuia.tipo_material
      };

      this.materialService.crearMaterial(payload, this.archivoSeleccionado!).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Publicada', detail: 'La guía se subió correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err)
      });
    }
  }

  private finalizarGuardado() {
    this.displayDialog = false;
    this.subiendoArchivo = false;
    this.cargarDatos();
  }

  private manejarError(error: any) {
    this.subiendoArchivo = false;
    this.cdr.detectChanges();
    const mensaje = error.error?.message || 'Hubo un problema al procesar la guía.';
    this.messageService.add({ severity: 'error', summary: 'Error al guardar', detail: mensaje });
  }

  eliminarGuia(id: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta guía? Desaparecerá para todos los usuarios y se borrará el archivo.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.materialService.eliminarMaterial(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Guía borrada exitosamente.' });
            this.cargarDatos();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la guía.' });
          }
        });
      }
    });
  }

  getNombreArea(valor: TipoMaterial): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }
}