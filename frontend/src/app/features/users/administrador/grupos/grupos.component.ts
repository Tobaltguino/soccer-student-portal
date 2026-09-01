import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

// Servicio de Angular (Conectado a NestJS)
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';

// 🔥 IMPORTAMOS TU SERVICIO DE EXCEL
import { ExcelExportService } from '../../../../core/services/excel-export.service';

@Component({
  selector: 'app-administrador-grupos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TooltipModule,
    TableModule, 
    ButtonModule, 
    DialogModule, 
    InputTextModule, 
    TextareaModule, 
    ConfirmDialogModule,
    TagModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './grupos.component.html',
  styleUrls: ['./grupos.component.scss']
})
export class AdministradorGruposComponent implements OnInit {

  private grupoService = inject(GrupoService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  
  // 🔥 INYECTAMOS EL SERVICIO DE EXCEL
  private excelService = inject(ExcelExportService);

  grupos: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  tituloDialogo: string = '';
  
  // Variable para controlar el bloqueo de pantalla
  guardando: boolean = false; 
  
  // Objeto del formulario
  grupoForm: any = { id: null, nombre: '', descripcion: '' };

  ngOnInit() {
    this.cargarGrupos();
  }

  cargarGrupos() {
    this.loading = true;
    
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data.map((g: any) => ({
            ...g,
            cantidad_alumnos: (g.estudiantes && g.estudiantes.length > 0) ? g.estudiantes[0].count : 0
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // 🔥 NUEVO MÉTODO PARA EXPORTAR EXCEL
  descargarExcel() {
    if (this.grupos.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay grupos para exportar.' });
      return;
    }
    
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: 'Generando archivo Excel...' });
    this.cdr.detectChanges();
    
    // Exportamos (pasando false para no incluir los eliminados por defecto)
    this.excelService.exportarGrupos(false);
  }

  // --- ABRIR DIÁLOGOS ---
  abrirNuevo() {
    this.tituloDialogo = 'Nuevo Grupo';
    this.grupoForm = { id: null, nombre: '', descripcion: '' }; // Limpiar form
    this.displayDialog = true;
  }

  abrirEditar(grupo: any) {
    this.tituloDialogo = 'Editar Grupo';
    this.grupoForm = { ...grupo }; 
    this.displayDialog = true;
  }

  // --- GUARDAR ---
  guardarGrupo() {
    if (this.guardando) return;

    if (!this.grupoForm.nombre || this.grupoForm.nombre.trim() === '') {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre es obligatorio.' });
      return;
    }

    this.guardando = true;

    const payload = { 
      nombre: this.grupoForm.nombre,
      descripcion: this.grupoForm.descripcion
    };

    if (this.grupoForm.id) {
      this.grupoService.actualizarGrupo(this.grupoForm.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo actualizado correctamente.' });
          this.displayDialog = false;
          this.guardando = false; 
          this.cargarGrupos();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el grupo.' });
          this.guardando = false; 
        }
      });
    } else {
      this.grupoService.crearGrupo(payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo creado correctamente.' });
          this.displayDialog = false;
          this.guardando = false; 
          this.cargarGrupos();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el grupo.' });
          this.guardando = false; 
        }
      });
    }
  }

  // --- ELIMINAR ---
  eliminarGrupo(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que quieres eliminar este grupo? Se desvincularán los alumnos asignados.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      accept: () => {
        this.grupoService.eliminarGrupo(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Grupo eliminado correctamente.' });
            this.cargarGrupos();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el grupo.' });
          }
        });
      }
    });
  }
}