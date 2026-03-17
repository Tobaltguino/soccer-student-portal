import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

import { SupabaseService } from '../../../../core/services/supabase.service'; 

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
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './nutri-guides.html',
  styleUrls: ['./nutri-guides.css']
})
export class NutriGuidesComponent implements OnInit {
  guias: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  
  // Modelo limpio, solo para crear
  nuevaGuia: any = { titulo: '', descripcion: '', archivo_url: '' };
  archivoSeleccionado: File | null = null;
  subiendoArchivo: boolean = false;

  constructor(
    private supabase: SupabaseService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      // ✅ Petición optimizada: Le pedimos a Supabase que traiga SOLAMENTE las guías de Nutrición.
      // (Si no modificaste el servicio con el parámetro opcional, puedes hacer: 
      // const res = await this.supabase.getGuias(); y luego hacer el .filter() aquí mismo)
      const guiasRes = await this.supabase.getGuias('NUTRICION'); 
      this.guias = guiasRes.data || [];
      
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los documentos.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  abrirNuevo() {
    this.nuevaGuia = { titulo: '', descripcion: '', archivo_url: '' };
    this.archivoSeleccionado = null;
    this.displayDialog = true;
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.messageService.add({ severity: 'warn', summary: 'Archivo muy grande', detail: 'El archivo no debe superar los 5MB' });
        event.target.value = '';
        return;
      }
      this.archivoSeleccionado = file;
    }
  }

  async guardarGuia() {
    if (!this.nuevaGuia.titulo || !this.archivoSeleccionado) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Debe ingresar un título y adjuntar un archivo.' });
      return;
    }

    this.subiendoArchivo = true;
    this.cdr.detectChanges();

    try {
      // 1. Subimos el archivo a Storage
      const urlFinal = await this.supabase.uploadGuiaFile(this.archivoSeleccionado, this.nuevaGuia.titulo);
      
      // 2. Armamos el objeto forzando la categoría (Sello de seguridad)
      const guiaParaBD = {
        titulo: this.nuevaGuia.titulo,
        descripcion: this.nuevaGuia.descripcion,
        archivo_url: urlFinal,
        tipo_material: 'NUTRICION' // 🔒 Esta etiqueta categoriza el material automáticamente
      };

      // 3. Creamos el registro en la BD
      const { error } = await this.supabase.createGuia(guiaParaBD);
      if (error) throw error;
      
      this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'El material se subió correctamente.' });
      
      this.displayDialog = false;
      this.cargarDatos();

    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error al subir', detail: error.message || 'Hubo un problema al procesar el archivo.' });
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }
}