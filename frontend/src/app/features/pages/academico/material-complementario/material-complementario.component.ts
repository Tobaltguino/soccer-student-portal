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
import { TagModule } from 'primeng/tag';

// AuthService (Ruta ajustada al Core)
import { AuthService } from '../../../../core/auth/services/auth.service';

// Servicios y Modelos Locales (Feature-based)
import { MaterialService } from './services/material.service';
import { Material, CrearMaterialPayload, ActualizarMaterialPayload } from './models/material.interface';

// Enums Compartidos
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';

@Component({
  selector: 'app-material-complementario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SelectModule, TextareaModule, TagModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './material-complementario.component.html',
  styleUrls: ['./material-complementario.component.scss']
})
export class MaterialComplementarioComponent implements OnInit {
  
  private authService = inject(AuthService);
  private materialService = inject(MaterialService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  // Permisos y Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esEstudiante: boolean = false;
  esProfesor: boolean = false;
  esKinesiologo: boolean = false;
  esNutricionista: boolean = false;
  puedeSubir: boolean = false;

  guias: Material[] = [];
  guiasFiltradas: Material[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: null };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  // Filtros visuales interactivos
  filtroArea: string | null = null;

  tiposMaterial = [
    { label: 'Técnico / Físico', value: TipoMaterial.FISICO },
    { label: 'Nutrición', value: TipoMaterial.NUTRICION },
    { label: 'Kinesiología', value: TipoMaterial.KINESIOLOGICO }
  ];

  async ngOnInit() {
    await this.verificarRolYCargar();
  }

  async verificarRolYCargar() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esAdmin = this.rolActual === 'administrador';
      this.esEstudiante = this.rolActual === 'estudiante';
      this.esProfesor = this.rolActual === 'profesor';
      this.esKinesiologo = this.rolActual === 'kinesiologo';
      this.esNutricionista = this.rolActual === 'nutricionista';

      this.puedeSubir = !this.esEstudiante;

      // Filtros fijos por rol de Staff
      if (this.esProfesor) this.filtroArea = TipoMaterial.FISICO;
      if (this.esKinesiologo) this.filtroArea = TipoMaterial.KINESIOLOGICO;
      if (this.esNutricionista) this.filtroArea = TipoMaterial.NUTRICION;

      await this.cargarDatos();
    } catch (error) {
      console.error('Error inicializando módulo de material:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarDatos() {
    this.loading = true;
    
    try {
      // 🔥 Llamada a Promesa nativa
      const response = await this.materialService.listarMaterial({ limite: 200 });
      this.guias = response.registros || [];
      this.aplicarFiltros();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las guías.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltros() {
    if (this.filtroArea) {
      this.guiasFiltradas = this.guias.filter(g => g.tipo_material === this.filtroArea);
    } else {
      this.guiasFiltradas = [...this.guias];
    }
  }

  limpiarFiltros() {
    if (!this.esAdmin && !this.esEstudiante) return; // Staff tiene filtro bloqueado
    this.filtroArea = null;
    this.aplicarFiltros();
  }

  abrirNuevo() {
    const areaDefault = (!this.esAdmin && this.filtroArea) ? this.filtroArea : null;
    
    this.nuevaGuia = { id: null, titulo: '', descripcion: '', archivo_url: '', tipo_material: areaDefault };
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

  async guardarGuia() {
    if (this.subiendoArchivo) return;

    if (!this.nuevaGuia.titulo || !this.nuevaGuia.tipo_material || (!this.nuevaGuia.id && !this.archivoSeleccionado)) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título, seleccionar el área y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    try {
      if (this.nuevaGuia.id) {
        // ACTUALIZAR (🔥 Promesa nativa)
        const payload: ActualizarMaterialPayload = {
          titulo: this.nuevaGuia.titulo,
          descripcion: this.nuevaGuia.descripcion,
          tipoMaterial: this.nuevaGuia.tipo_material
        };
        await this.materialService.actualizarMaterial(this.nuevaGuia.id, payload, this.archivoSeleccionado || undefined);
        this.messageService.add({ severity: 'success', summary: 'Actualizada', detail: 'La guía se modificó correctamente.' });
      } else {
        // CREAR NUEVO (🔥 Promesa nativa)
        const payload: CrearMaterialPayload = {
          titulo: this.nuevaGuia.titulo,
          descripcion: this.nuevaGuia.descripcion,
          tipoMaterial: this.nuevaGuia.tipo_material
        };
        await this.materialService.crearMaterial(payload, this.archivoSeleccionado!);
        this.messageService.add({ severity: 'success', summary: 'Publicada', detail: 'La guía se subió correctamente.' });
      }
      this.displayDialog = false;
      await this.cargarDatos();
    } catch (error: any) {
      const mensaje = error?.message || 'Hubo un problema al procesar la guía.';
      this.messageService.add({ severity: 'error', summary: 'Error al guardar', detail: mensaje });
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }

  eliminarGuia(id: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta guía? Desaparecerá para todos los usuarios y se borrará el archivo.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          // 🔥 Promesa nativa
          await this.materialService.eliminarMaterial(id);
          this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Guía borrada exitosamente.' });
          await this.cargarDatos();
        } catch (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la guía.' });
        }
      }
    });
  }

  getNombreArea(valor: string): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }

  getTiposMaterialPermitidos() {
    if (this.esAdmin) return this.tiposMaterial;
    return this.tiposMaterial.filter(t => t.value === this.filtroArea);
  }
}