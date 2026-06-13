import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast'; 
import { ConfirmationService, MessageService } from 'primeng/api'; 

import { GruposService } from '../../../../core/services/modulos/academico/grupos.service';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
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
  templateUrl: './admin-groups.html',
  styleUrls: ['./admin-groups.css']
})
export class AdminGroupsComponent implements OnInit {

  grupos: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  tituloDialogo: string = '';
  
  // Objeto del formulario
  grupoForm: any = { id: null, nombre: '', descripcion: '' };

  constructor(
    private gruposService: GruposService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGrupos();
  }

  async cargarGrupos() {
    this.loading = true;
    
    const { data, error } = await this.gruposService.getGrupos();
    
    if (data) {
      this.grupos = data.map((g: any) => ({
          ...g,
          cantidad_alumnos: (g.estudiantes && g.estudiantes.length > 0) ? g.estudiantes[0].count : 0
      }));
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos.' });
    }
    
    this.loading = false;
    this.cdr.detectChanges();
  }

  // --- ABRIR DIÁLOGOS ---
  abrirNuevo() {
    this.tituloDialogo = 'Nuevo Grupo';
    this.grupoForm = { id: null, nombre: '', descripcion: '' }; 
    this.displayDialog = true;
  }

  abrirEditar(grupo: any) {
    this.tituloDialogo = 'Editar Grupo';
    this.grupoForm = { ...grupo }; 
    this.displayDialog = true;
  }

  // --- GUARDAR ---
  async guardarGrupo() {
    if (!this.grupoForm.nombre || this.grupoForm.nombre.trim() === '') {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre es obligatorio.' });
      return;
    }

    const datos = { 
      nombre: this.grupoForm.nombre,
      descripcion: this.grupoForm.descripcion
    };

    let result;
    if (this.grupoForm.id) {
      result = await this.gruposService.updateGrupo(this.grupoForm.id, datos);
    } else {
      result = await this.gruposService.createGrupo(datos);
    }

    if (result.error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: result.error.message });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo guardado correctamente.' });
      this.displayDialog = false;
      this.cargarGrupos();
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
      accept: async () => {
        const { error } = await this.gruposService.deleteGrupo(id);
        if (!error) {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Grupo eliminado correctamente.' });
            this.cargarGrupos();
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el grupo.' });
        }
      }
    });
  }
}