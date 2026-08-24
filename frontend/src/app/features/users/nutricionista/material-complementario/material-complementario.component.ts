import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { MaterialService } from '../../../../core/domains/academico/material-complementario/services/material-complementario.service';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';
import { Material, CrearMaterialPayload, ActualizarMaterialPayload } from '../../../../core/domains/academico/material-complementario/models/material.interface';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';

@Component({
  selector: 'app-nutricionista-material-complementario',
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
    TextareaModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './material-complementario.component.html',
  styleUrls: ['./material-complementario.component.scss']
})
export class NutricionistaMaterialComplementarioComponent implements OnInit {
  
  private materialService = inject(MaterialService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  guias: Material[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;

  // Id del usuario logueado, usado para saber si puede editar un material
  usuarioActualId: string | null = null;
  
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  ngOnInit() {
    this.cargarUsuarioActual();
    this.cargarDatos();
  }

  cargarUsuarioActual() {
    this.usuarioService.obtenerMiPerfil().subscribe({
      next: (perfil: any) => {
        this.usuarioActualId = perfil.id_usuario ?? perfil.id ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.usuarioActualId = null;
      }
    });
  }

  cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();
    
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

  /**
   * Solo puede editar si fue creado por el nutricionista actual (el tipo ya viene fijo a NUTRICION por el filtro del servidor).
   */
  puedeEditar(guia: Material): boolean {
    return !!this.usuarioActualId && guia.creado_por === this.usuarioActualId;
  }

  abrirNuevo() {
    this.nuevaGuia = { id: null, titulo: '', descripcion: '', archivo_url: '' };
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
      if (file.size > 20 * 1024 * 1024) {
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
      // ACTUALIZAR (metadatos + archivo opcional)
      const payload: ActualizarMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion
      };

      this.materialService.actualizarMaterial(this.nuevaGuia.id, payload, this.archivoSeleccionado).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Documento modificado correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err, 'Error al actualizar')
      });

    } else {
      // CREAR NUEVO
      const payload: CrearMaterialPayload = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        tipoMaterial: TipoMaterial.NUTRICION
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