import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
import { TextareaModule } from 'primeng/textarea';

// Servicios y Modelos unificados a NestJS
import { MaterialService } from '../../../../core/domains/academico/material-complementario/services/material-complementario.service';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';
import { Material, CrearMaterialPayload, ActualizarMaterialPayload } from '../../../../core/domains/academico/material-complementario/models/material.interface';

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
    TooltipModule,
    TextareaModule
  ],
  providers: [MessageService],
  templateUrl: './nutri-guides.html',
  styleUrls: ['./nutri-guides.css']
})
export class NutriGuidesComponent implements OnInit {
  
  private materialService = inject(MaterialService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  guias: Material[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  // Modelo limpio para crear/editar
  nuevaGuia: any = { id: null, titulo: '', descripcion: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();
    
    // ✅ Filtramos directamente desde NestJS para que solo traiga lo de Nutrición
    this.materialService.listarMaterial({ tipoMaterial: TipoMaterial.NUTRICION, limite: 100 }).subscribe({
      next: (response) => {
        this.guias = response.registros || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los documentos.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- LÓGICA PARA CREAR / EDITAR MATERIAL ---
  abrirNuevo() {
    this.nuevaGuia = { id: null, titulo: '', descripcion: '' };
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
      if (file.size > 20 * 1024 * 1024) { // Límite 20MB
        this.messageService.add({ severity: 'warn', summary: 'Archivo muy grande', detail: 'El archivo no debe superar los 20MB' });
        event.target.value = '';
        return;
      }
      this.archivoSeleccionado = file;
    }
  }

  guardarGuia() {
    if (!this.nuevaGuia.titulo || (!this.nuevaGuia.id && !this.archivoSeleccionado)) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    if (this.nuevaGuia.id) {
      // ✏️ ACTUALIZAR (Solo Textos)
      const payload: ActualizarMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion
      };

      this.materialService.actualizarMaterial(this.nuevaGuia.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Documento modificado correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err, 'Error al actualizar')
      });

    } else {
      // 🚀 CREAR NUEVO
      const payload: CrearMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipoMaterial: TipoMaterial.NUTRICION // 🔒 Se categoriza automáticamente
      };

      this.materialService.crearMaterial(payload, this.archivoSeleccionado!).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'El material se subió correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err, 'Error al subir')
      });
    }
  }

  private finalizarGuardado() {
    this.displayDialog = false;
    this.subiendoArchivo = false;
    this.cargarDatos();
  }

  private manejarError(error: any, summary: string) {
    this.subiendoArchivo = false;
    this.cdr.detectChanges();
    const mensaje = error.error?.message || 'Hubo un problema al procesar la solicitud.';
    this.messageService.add({ severity: 'error', summary: summary, detail: mensaje });
  }
}