import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select'; 
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';

import { MaterialService } from '../../../../core/domains/academico/material-complementario/services/material-complementario.service';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';
import { Material, CrearMaterialPayload, ActualizarMaterialPayload } from '../../../../core/domains/academico/material-complementario/models/material.interface';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';

@Component({
  selector: 'app-kinesiologo-material-complementario',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    ButtonModule, 
    TooltipModule, 
    TableModule, 
    InputTextModule,
    DatePickerModule, 
    SelectModule,
    ToastModule,
    DialogModule,
    TextareaModule,
    TagModule
  ],
  providers: [MessageService],
  templateUrl: './material-complementario.component.html',
  styleUrls: ['./material-complementario.component.scss']
})
export class KinesiollogoMaterialComplementarioComponent implements OnInit {
  
  private materialService = inject(MaterialService);
  private usuarioService = inject(UsuarioService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  guias: Material[] = [];
  guiasOriginales: Material[] = []; 
  loading: boolean = true;

  // Id del usuario logueado, usado para saber si puede editar un material
  usuarioActualId: string | null = null;

  // Enum expuesto al template para comparar sin strings mágicos
  readonly tipoMaterialKinesiologico = TipoMaterial.KINESIOLOGICO;

  // --- FILTROS ---
  filtroTitulo: string = ''; 
  filtroFecha: Date | null = null;
  filtroArea: TipoMaterial | null = null;

  tiposMaterial = [
    { label: 'Técnico / Físico', value: TipoMaterial.FISICO },
    { label: 'Nutrición', value: TipoMaterial.NUTRICION },
    { label: 'Kinesiología', value: TipoMaterial.KINESIOLOGICO }
  ];

  // --- SUBIDA / EDICIÓN DE MATERIAL ---
  displayDialog: boolean = false;
  nuevaGuia: any = { id: null, titulo: '', descripcion: '', archivo_url: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  ngOnInit() {
    this.cargarUsuarioActual();
    this.cargarGuias();
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

  cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    this.materialService.listarMaterial({ limite: 100 }).subscribe({
      next: (response) => {
        this.guiasOriginales = response.registros || [];
        this.aplicarFiltros(); 
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

  aplicarFiltros() {
    this.guias = this.guiasOriginales.filter(guia => {
      const coincideTitulo = (guia.titulo || '').toLowerCase().includes(this.filtroTitulo.toLowerCase().trim());
      
      let coincideFecha = true;
      if (this.filtroFecha) {
        const fechaGuia = new Date(guia.created_at);
        const fechaFiltro = new Date(this.filtroFecha);
        
        coincideFecha = fechaGuia.getFullYear() === fechaFiltro.getFullYear() &&
                        fechaGuia.getMonth() === fechaFiltro.getMonth() &&
                        fechaGuia.getDate() === fechaFiltro.getDate();
      }

      let coincideArea = true;
      if (this.filtroArea) {
        coincideArea = guia.tipo_material === this.filtroArea;
      }

      return coincideTitulo && coincideFecha && coincideArea;
    });

    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroTitulo = '';
    this.filtroFecha = null;
    this.filtroArea = null;
    this.aplicarFiltros(); 
  }

  getNombreArea(valor: TipoMaterial): string {
    const area = this.tiposMaterial.find(t => t.value === valor);
    return area ? area.label : 'General';
  }

  /**
   * Solo puede editar si el material es de Kinesiología Y fue creado por el kinesiólogo actual.
   */
  puedeEditar(guia: Material): boolean {
    return guia.tipo_material === this.tipoMaterialKinesiologico
      && !!this.usuarioActualId
      && guia.creado_por === this.usuarioActualId;
  }

  // --- LÓGICA PARA CREAR / EDITAR MATERIAL ---
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
        tipoMaterial: TipoMaterial.KINESIOLOGICO
      };

      this.materialService.crearMaterial(payload, this.archivoSeleccionado!).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'Material subido correctamente.' });
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err, 'Error al subir')
      });
    }
  }

  private finalizarGuardado() {
    this.displayDialog = false;
    this.subiendoArchivo = false;
    this.cargarGuias();
  }

  private manejarError(error: any, summary: string) {
    this.subiendoArchivo = false;
    this.cdr.detectChanges();
    const mensaje = error.error?.message || 'Hubo un problema al procesar la solicitud.';
    this.messageService.add({ severity: 'error', summary: summary, detail: mensaje });
  }
}